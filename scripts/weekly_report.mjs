import https from "https";
import nodemailer from "nodemailer";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID = "1-iFLORoVt9ocMaGa5tLLD7NgoU_3d3TV7KOlNUoRUuw";
const SHEET_NAME = "Semanal";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const RECIPIENTS = [
  "robson.privado@madeiramadeira.com.br",
  "fernando.belleza@madeiramadeira.com.br",
  "alexandre.pereira@iguanafix.com.br",
  "bianca.pessoa@madeiramadeira.com.br",
  "lucas.navarro@madeiramadeira.com.br"
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(data) } }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve(raw));
    }).on("error", reject);
  });
}

// ─── 1. FETCH GOOGLE SHEETS ───────────────────────────────────────────────────
async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
  console.log("📊 Buscando dados do Google Sheets...");
  const csv = await httpsGet(url);
  const lines = csv.trim().split("\n").map(l => {
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of l) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
  console.log(`✅ ${lines.length} linhas encontradas`);
  return lines;
}

// ─── 2. PARSE DATA ────────────────────────────────────────────────────────────
function parseData(lines) {
  // Find header row (row with week labels like 1/2026)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].some(c => /^\d+\/20(25|26)$/.test(c))) { headerIdx = i; break; }
  }
  if (headerIdx === -1) { console.log("⚠️ Header não encontrado, usando linha 6"); headerIdx = 5; }

  const headers = lines[headerIdx] || [];
  console.log(`📌 Header encontrado na linha ${headerIdx}`);

  // Find 2026 week columns
  const weekCols = [];
  headers.forEach((h, i) => { if (/^\d+\/2026$/.test(h)) weekCols.push({ col: i, week: h }); });
  console.log(`📅 Semanas 2026 encontradas: ${weekCols.map(w => w.week).join(", ")}`);

  // Take last 9 weeks with data
  const recentWeeks = weekCols.filter(({ col }) => {
    return lines.slice(headerIdx + 1).some(row => row[col] && row[col] !== "0" && row[col] !== "");
  }).slice(-9);

  console.log(`📅 Semanas com dados: ${recentWeeks.map(w => w.week).join(", ")}`);

  // Extract key metrics
  const metrics = {};
  const targets = [
    "GMV TOTAL", "GMV Automático", "GMV App", "GMV Site",
    "GMV GuideShops", "GMV TDV", "GMV AVULSO TOTAL",
    "CONVERSÃO GERAL (BUNDLE)", "AOV TOTAL"
  ];

  lines.forEach(row => {
    const name = row[0]?.trim();
    if (!name) return;
    targets.forEach(t => {
      if (name === t && !metrics[t]) {
        const vals = recentWeeks.map(({ col, week }) => ({ week, value: row[col] || "0" }));
        const wow = row[row.length - 6] || "";
        const vsMeta = row[row.length - 4] || "";
        metrics[t] = { values: vals, wow, vsMeta };
        console.log(`✅ Métrica encontrada: ${name}`);
      }
    });
  });

  return { metrics, recentWeeks };
}

// ─── 3. BUILD BUSINESS DATA STRING ───────────────────────────────────────────
function buildDataString(metrics, recentWeeks) {
  const weeks = recentWeeks.map(w => w.week).join(", ");
  let str = `DADOS DE PERFORMANCE — REPORT COMERCIAL SERVIÇOS 2026\nSemanas analisadas: ${weeks}\n\n`;
  Object.entries(metrics).forEach(([name, data]) => {
    const vals = data.values.map(v => `${v.week}=${v.value}`).join(", ");
    str += `${name}: ${vals}`;
    if (data.wow) str += ` | WoW: ${data.wow}`;
    if (data.vsMeta) str += ` | vs Meta: ${data.vsMeta}`;
    str += "\n";
  });
  str += "\nCONTEXTO: Marketplace de serviços para casa. Canais: App/Site (digital automático), GuideShops (loja física), TDV (vendedor dedicado), Avulso (serviços standalone como montagem, impermeabilização, limpeza).";
  console.log("\n📋 Dados extraídos:\n" + str);
  return str;
}

// ─── 4. GENERATE ANALYSIS VIA CLAUDE ─────────────────────────────────────────
async function generateAnalysis(dataString) {
  console.log("\n🤖 Gerando análise com Claude...");
  const res = await httpsPost(
    "api.anthropic.com",
    "/v1/messages",
    { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `Você é um analista estratégico sênior de um marketplace de serviços para casa.
Produza análise executiva de performance semanal para reunião de liderança.
Use APENAS os dados fornecidos. Não invente números.
Responda SOMENTE com JSON válido, sem markdown, sem backticks.

Estrutura:
{
  "semana_referencia": "string (ex: Semana 9/2026)",
  "executive_summary": "resumo em 4-6 frases",
  "key_drivers": [{"indicador":"string","variacao":"string","drivers":["string"]}],
  "structural_trends": [{"indicador":"string","tipo":"crescimento consistente|queda consistente|volatilidade","analise":"string"}],
  "risks_anomalies": [{"risco":"string","driver":"string"}],
  "root_cause": [{"movimento":"string","causa":"string","breakdown":["string"]}],
  "actions": [{"area":"string","acao":"string"}],
  "questions": ["string"]
}`,
      messages: [{ role: "user", content: `Analise os dados:\n\n${dataString}` }]
    }
  );
  const text = res.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const analysis = JSON.parse(clean);
  console.log(`✅ Análise gerada para ${analysis.semana_referencia}`);
  return analysis;
}

// ─── 5. BUILD HTML EMAIL ──────────────────────────────────────────────────────
function buildEmail(analysis) {
  const today = new Date().toLocaleDateString("pt-BR", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const sectionHtml = (num, title, color, content) => `
    <div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${color}15;padding:12px 18px;border-bottom:1px solid #e5e7eb">
        <span style="background:${color}25;color:${color};border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;font-family:monospace;margin-right:8px">${num}</span>
        <span style="font-weight:700;font-size:13px;color:#111;text-transform:uppercase;letter-spacing:0.05em">${title}</span>
      </div>
      <div style="padding:16px 18px;font-size:13px;line-height:1.7;color:#374151">${content}</div>
    </div>`;

  const drivers = analysis.key_drivers.map(d => `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6">
      <strong style="color:#111">${d.indicador}</strong>
      <span style="color:${d.variacao.startsWith("+") || d.variacao.includes("▲") ? "#059669":"#dc2626"};font-family:monospace;font-size:12px;margin-left:8px">${d.variacao}</span>
      <ul style="margin:6px 0 0 16px;padding:0">${d.drivers.map(dr => `<li style="color:#6b7280;margin-bottom:3px">${dr}</li>`).join("")}</ul>
    </div>`).join("");

  const trends = analysis.structural_trends.map(t => {
    const badge = t.tipo === "crescimento consistente" ? { bg:"#d1fae5", color:"#059669", label:"▲ CRESCIMENTO" }
      : t.tipo === "queda consistente" ? { bg:"#fee2e2", color:"#dc2626", label:"▼ QUEDA" }
      : { bg:"#fef3c7", color:"#d97706", label:"~ VOLATILIDADE" };
    return `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6">
      <span style="background:${badge.bg};color:${badge.color};font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;margin-right:8px">${badge.label}</span>
      <strong style="color:#111">${t.indicador}</strong>
      <p style="margin:6px 0 0;color:#6b7280;font-size:12px">${t.analise}</p>
    </div>`;}).join("");

  const risks = analysis.risks_anomalies.map(r => `
    <div style="margin-bottom:10px;padding:12px;background:#fff7ed;border-left:3px solid #f97316;border-radius:0 6px 6px 0">
      <strong style="color:#c2410c">⚠ ${r.risco}</strong>
      <p style="margin:4px 0 0;color:#6b7280;font-size:12px">${r.driver}</p>
    </div>`).join("");

  const actions = analysis.actions.map(a => `
    <div style="margin-bottom:10px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px">
      <div style="font-size:10px;color:#059669;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">${a.area}</div>
      <div style="font-size:13px;color:#374151">${a.acao}</div>
    </div>`).join("");

  const questions = analysis.questions.map(q => `
    <li style="padding:6px 0;border-bottom:1px solid #f3f4f6;color:#374151">
      <span style="color:#3b82f6;font-weight:700;margin-right:6px">?</span>${q}
    </li>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',system-ui,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px">
    <div style="background:linear-gradient(135deg,#0a0c10,#1a1f2e);border-radius:12px;padding:28px 32px;margin-bottom:20px">
      <div style="font-size:11px;color:#00e5a0;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">✦ ANÁLISE EXECUTIVA AUTOMÁTICA</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px">Report Comercial Serviços</h1>
      <div style="color:#6b7280;font-size:12px;font-family:monospace">${analysis.semana_referencia} · ${today}</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:20px;border:1px solid #e5e7eb;border-left:4px solid #00e5a0">
      <div style="font-size:11px;font-weight:700;color:#00b37e;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">01 · Executive Summary</div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${analysis.executive_summary}</p>
    </div>
    ${sectionHtml("02", "Key Business Drivers", "#3b82f6", drivers)}
    ${sectionHtml("03", "Structural Trends", "#8b5cf6", trends)}
    ${sectionHtml("04", "Key Risks & Anomalies", "#f97316", risks)}
    ${sectionHtml("06", "Recommended Actions", "#10b981", actions)}
    <div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#eff6ff;padding:12px 18px;border-bottom:1px solid #e5e7eb">
        <span style="font-weight:700;font-size:13px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em">07 · Questions for Leadership</span>
      </div>
      <div style="padding:16px 18px"><ul style="list-style:none;margin:0;padding:0">${questions}</ul></div>
    </div>
    <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;font-family:monospace">
      Gerado automaticamente toda segunda-feira às 09:00 · 
      <a href="https://dashboard-servicos.vercel.app" style="color:#00b37e;text-decoration:none">Ver Dashboard Completo →</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── 6. SEND EMAIL VIA GMAIL ──────────────────────────────────────────────────
async function sendEmail(html, semana) {
  console.log("📧 Enviando email via Gmail...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
  });
  await transporter.sendMail({
    from: `"Dashboard Serviços" <${GMAIL_USER}>`,
    to: RECIPIENTS.join(", "),
    subject: `📊 Análise Executiva — ${semana}`,
    html
  });
  console.log(`✅ Email enviado para ${RECIPIENTS.length} destinatários`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log("🚀 Iniciando relatório semanal...\n");
    const lines = await fetchSheetData();
    const { metrics, recentWeeks } = parseData(lines);
    const dataString = buildDataString(metrics, recentWeeks);
    const analysis = await generateAnalysis(dataString);
    const html = buildEmail(analysis);
    await sendEmail(html, analysis.semana_referencia);
    console.log("\n✅ Relatório semanal concluído com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
}

main();

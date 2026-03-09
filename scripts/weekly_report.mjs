import https from "https";
import nodemailer from "nodemailer";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID = "1-iFLORoVt9ocMaGa5tLLD7NgoU_3d3TV7KOlNUoRUuw";
const SHEET_NAME = "Semanal";
const GA4_PROPERTY_ID = "376951228";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
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

// ─── 1. FETCH GOOGLE SHEETS via API ──────────────────────────────────────────
async function fetchSheetData() {
  console.log("📊 Buscando dados do Google Sheets via API...");
  const auth = new GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const token = await auth.getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME + '!A1:DZ300')}`;
  const data = await new Promise((resolve, reject) => {
    https.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    }).on("error", reject);
  });

  const lines = (data.values || []).map(row => row.map(v => (v || "").trim()));
  console.log(`✅ ${lines.length} linhas encontradas`);
  return lines;
}

// ─── 2. PARSE SHEET DATA ──────────────────────────────────────────────────────
function parseData(lines) {
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].some(c => /^\d+\/20(25|26)$/.test(c))) { headerIdx = i; break; }
  }
  if (headerIdx === -1) headerIdx = 5;
  const headers = lines[headerIdx] || [];
  const weekCols = [];
  headers.forEach((h, i) => { if (/^\d+\/2026$/.test(h)) weekCols.push({ col: i, week: h }); });
  const recentWeeks = weekCols.filter(({ col }) =>
    lines.slice(headerIdx + 1).some(row => row[col] && row[col] !== "0" && row[col] !== "")
  ).slice(-9);

  const metrics = {};
  const targets = ["GMV TOTAL","GMV Automático","GMV App","GMV Site","GMV GuideShops","GMV TDV","GMV AVULSO TOTAL","CONVERSÃO GERAL (BUNDLE)","AOV TOTAL"];
  lines.forEach(row => {
    const name = row[0]?.trim();
    if (!name) return;
    targets.forEach(t => {
      if (name === t && !metrics[t]) {
        metrics[t] = {
          values: recentWeeks.map(({ col, week }) => ({ week, value: row[col] || "0" })),
          wow: row[row.length - 6] || "",
          vsMeta: row[row.length - 4] || ""
        };
      }
    });
  });
  return { metrics, recentWeeks };
}

// ─── 3. FETCH GA4 DATA ────────────────────────────────────────────────────────
async function fetchGA4Data() {
  console.log("📡 Buscando dados do GA4...");
  try {
    const auth = new GoogleAuth({
      credentials: SERVICE_ACCOUNT,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
    });
    const client = new BetaAnalyticsDataClient({ auth });

    // Last 7 days report
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [
        { name: "sessionDefaultChannelGroup" },
        { name: "deviceCategory" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "conversions" },
        { name: "engagementRate" },
      ]
    });

    // Pages report for Avulso services
    const [pagesResponse] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "conversions" }],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: { matchType: "BEGINS_WITH", value: "/servicos" }
        }
      },
      limit: 10
    });

    const ga4 = { channels: [], devices: [], pages: [] };

    // Process channel + device data
    response.rows?.forEach(row => {
      const channel = row.dimensionValues[0].value;
      const device = row.dimensionValues[1].value;
      const sessions = parseInt(row.metricValues[0].value || 0);
      const conversions = parseInt(row.metricValues[1].value || 0);
      const engagement = parseFloat(row.metricValues[2].value || 0);
      ga4.channels.push({ channel, device, sessions, conversions, engagement: (engagement * 100).toFixed(1) + "%" });
    });

    // Process pages data
    pagesResponse.rows?.forEach(row => {
      ga4.pages.push({
        page: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value || 0),
        conversions: parseInt(row.metricValues[1].value || 0),
      });
    });

    console.log(`✅ GA4: ${ga4.channels.length} linhas de canal/device, ${ga4.pages.length} páginas`);
    return ga4;
  } catch (err) {
    console.warn("⚠️ GA4 erro:", err.message);
    return null;
  }
}

// ─── 4. BUILD DATA STRING ─────────────────────────────────────────────────────
function buildDataString(metrics, recentWeeks, ga4) {
  const weeks = recentWeeks.map(w => w.week).join(", ");
  let str = `DADOS DE PERFORMANCE — REPORT COMERCIAL SERVIÇOS 2026\nSemanas: ${weeks}\n\n`;
  Object.entries(metrics).forEach(([name, data]) => {
    const vals = data.values.map(v => `${v.week}=${v.value}`).join(", ");
    str += `${name}: ${vals}`;
    if (data.wow) str += ` | WoW: ${data.wow}`;
    if (data.vsMeta) str += ` | vs Meta: ${data.vsMeta}`;
    str += "\n";
  });

  if (ga4) {
    str += "\nDADOS GA4 — ÚLTIMOS 7 DIAS:\n";
    const byChannel = {};
    ga4.channels.forEach(r => {
      if (!byChannel[r.channel]) byChannel[r.channel] = { sessions: 0, conversions: 0 };
      byChannel[r.channel].sessions += r.sessions;
      byChannel[r.channel].conversions += r.conversions;
    });
    Object.entries(byChannel).forEach(([ch, d]) => {
      str += `Canal ${ch}: ${d.sessions} sessões, ${d.conversions} conversões\n`;
    });

    const byDevice = {};
    ga4.channels.forEach(r => {
      if (!byDevice[r.device]) byDevice[r.device] = { sessions: 0 };
      byDevice[r.device].sessions += r.sessions;
    });
    Object.entries(byDevice).forEach(([dev, d]) => {
      str += `Device ${dev}: ${d.sessions} sessões\n`;
    });

    if (ga4.pages.length > 0) {
      str += "\nPáginas de serviço mais visitadas:\n";
      ga4.pages.slice(0, 5).forEach(p => {
        str += `${p.page}: ${p.sessions} sessões, ${p.conversions} conversões\n`;
      });
    }
  }

  str += "\nCONTEXTO: Marketplace de serviços para casa. Canais: App/Site (digital), GuideShops (loja física), TDV (vendedor dedicado), Avulso (montagem, impermeabilização, limpeza).";
  return str;
}

// ─── 5. GENERATE ANALYSIS ────────────────────────────────────────────────────
async function generateAnalysis(dataString) {
  console.log("\n🤖 Gerando análise com Claude...");
  const res = await httpsPost(
    "api.anthropic.com", "/v1/messages",
    { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `Você é um analista estratégico sênior de um marketplace de serviços para casa.
Produza análise executiva de performance semanal para reunião de liderança.
Use APENAS os dados fornecidos. Não invente números.
Responda SOMENTE com JSON válido, sem markdown, sem backticks.
Estrutura: {"semana_referencia":"string","executive_summary":"string","key_drivers":[{"indicador":"string","variacao":"string","drivers":["string"]}],"structural_trends":[{"indicador":"string","tipo":"crescimento consistente|queda consistente|volatilidade","analise":"string"}],"risks_anomalies":[{"risco":"string","driver":"string"}],"root_cause":[{"movimento":"string","causa":"string","breakdown":["string"]}],"actions":[{"area":"string","acao":"string"}],"questions":["string"]}`,
      messages: [{ role: "user", content: `Analise:\n\n${dataString}` }]
    }
  );
  const text = res.content?.map(b => b.text || "").join("") || "";
  const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());
  console.log(`✅ Análise gerada para ${analysis.semana_referencia}`);
  return analysis;
}

// ─── 6. BUILD EMAIL ───────────────────────────────────────────────────────────
function buildEmail(analysis, ga4) {
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
      <strong>${d.indicador}</strong>
      <span style="color:${d.variacao.startsWith("+") ? "#059669":"#dc2626"};font-family:monospace;font-size:12px;margin-left:8px">${d.variacao}</span>
      <ul style="margin:6px 0 0 16px">${d.drivers.map(dr => `<li style="color:#6b7280">${dr}</li>`).join("")}</ul>
    </div>`).join("");

  const risks = analysis.risks_anomalies.map(r => `
    <div style="margin-bottom:10px;padding:12px;background:#fff7ed;border-left:3px solid #f97316;border-radius:0 6px 6px 0">
      <strong style="color:#c2410c">⚠ ${r.risco}</strong>
      <p style="margin:4px 0 0;color:#6b7280;font-size:12px">${r.driver}</p>
    </div>`).join("");

  const actions = analysis.actions.map(a => `
    <div style="margin-bottom:10px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px">
      <div style="font-size:10px;color:#059669;font-family:monospace;text-transform:uppercase;margin-bottom:4px">${a.area}</div>
      <div>${a.acao}</div>
    </div>`).join("");

  const questions = analysis.questions.map(q => `
    <li style="padding:6px 0;border-bottom:1px solid #f3f4f6;color:#374151">
      <span style="color:#3b82f6;font-weight:700;margin-right:6px">?</span>${q}
    </li>`).join("");

  // GA4 section
  let ga4Section = "";
  if (ga4 && ga4.channels.length > 0) {
    const byChannel = {};
    ga4.channels.forEach(r => {
      if (!byChannel[r.channel]) byChannel[r.channel] = { sessions: 0, conversions: 0 };
      byChannel[r.channel].sessions += r.sessions;
      byChannel[r.channel].conversions += r.conversions;
    });
    const channelRows = Object.entries(byChannel)
      .sort((a,b) => b[1].sessions - a[1].sessions)
      .slice(0, 5)
      .map(([ch, d]) => `
        <tr>
          <td style="padding:8px 12px;color:#374151">${ch}</td>
          <td style="padding:8px 12px;text-align:right;font-family:monospace">${d.sessions.toLocaleString()}</td>
          <td style="padding:8px 12px;text-align:right;font-family:monospace;color:#059669">${d.conversions}</td>
        </tr>`).join("");

    ga4Section = sectionHtml("GA4", "Tráfego & Conversão — Últimos 7 dias", "#8b5cf6", `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Canal</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">Sessões</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">Conversões</th>
          </tr>
        </thead>
        <tbody>${channelRows}</tbody>
      </table>`);
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',system-ui,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px">
    <div style="background:linear-gradient(135deg,#0a0c10,#1a1f2e);border-radius:12px;padding:28px 32px;margin-bottom:20px">
      <div style="font-size:11px;color:#00e5a0;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">✦ ANÁLISE EXECUTIVA AUTOMÁTICA</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px">Report Comercial Serviços</h1>
      <div style="color:#6b7280;font-size:12px;font-family:monospace">${analysis.semana_referencia} · ${today}</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:20px;border:1px solid #e5e7eb;border-left:4px solid #00e5a0">
      <div style="font-size:11px;font-weight:700;color:#00b37e;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">01 · Executive Summary</div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${analysis.executive_summary}</p>
    </div>
    ${sectionHtml("02", "Key Business Drivers", "#3b82f6", drivers)}
    ${sectionHtml("04", "Key Risks & Anomalies", "#f97316", risks)}
    ${ga4Section}
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
</body></html>`;
}

// ─── 7. SEND EMAIL ────────────────────────────────────────────────────────────
async function sendEmail(html, semana) {
  console.log("📧 Enviando email...");
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
    const ga4 = await fetchGA4Data();
    const dataString = buildDataString(metrics, recentWeeks, ga4);
    const analysis = await generateAnalysis(dataString);
    const html = buildEmail(analysis, ga4);
    await sendEmail(html, analysis.semana_referencia);
    console.log("\n✅ Relatório semanal concluído com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
}

main();

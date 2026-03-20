import { GoogleAuth } from "google-auth-library";
import https from "https";
import { getSessionEmail } from "./_auth.js";

const SHEET_ID = "1-iFLORoVt9ocMaGa5tLLD7NgoU_3d3TV7KOlNUoRUuw";
const SHEET_NAME = "Semanal";

function parseNum(v) {
  if (!v || v === "-" || v === "") return 0;
  let s = String(v).replace(/R\$\s*/g, "").replace(/%/g, "").trim();
  if (/\d,\d/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(s) || 0;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, private");

  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: "Não autenticado" });

  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    return res.status(500).json({ error: "GOOGLE_SERVICE_ACCOUNT not configured" });
  }

  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const token = await auth.getAccessToken();
    const range = encodeURIComponent(`${SHEET_NAME}!A1:ZZ500`);

    const data = await new Promise((resolve, reject) => {
      https.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } },
        (r) => {
          let raw = "";
          r.on("data", (c) => (raw += c));
          r.on("end", () => {
            try { resolve(JSON.parse(raw)); }
            catch (e) { reject(e); }
          });
        }
      ).on("error", reject);
    });

    if (data.error) {
      return res.status(500).json({ error: JSON.stringify(data.error) });
    }

    const rows = (data.values || []).map((r) =>
      r.map((v) => (v == null ? "" : String(v).trim()))
    );

    // Encontra linha de cabeçalho: deve ter "Indicador" na col A E semanas WW/YYYY em outras colunas
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const hasIndicador = rows[i][0]?.trim() === "Indicador";
      const hasWeek = rows[i].some((c) => /^\d{1,2}\/\d{4}$/.test(c));
      if (hasIndicador && hasWeek) {
        headerIdx = i;
        break;
      }
    }
    // Fallback: encontra só pela coluna A = "Indicador"
    if (headerIdx === -1) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0]?.trim() === "Indicador") {
          headerIdx = i;
          break;
        }
      }
    }

    if (headerIdx === -1) {
      return res.status(200).json({ weeks: [], metrics: {} });
    }

    const headers = rows[headerIdx];

    // Coleta colunas de semanas
    const weekCols = [];
    headers.forEach((h, i) => {
      if (/^\d{1,2}\/\d{4}$/.test(h)) weekCols.push({ col: i, week: h });
    });

    // Constrói métricas a partir das linhas de dados
    const SKIP_LABELS = new Set(["Indicador", "Ref", ""]);
    const metrics = {};
    for (const row of rows.slice(headerIdx + 1)) {
      const label = row[0]?.trim();
      if (!label || SKIP_LABELS.has(label)) continue;
      metrics[label] = weekCols.map(({ col }) => ({
        value: parseNum(row[col]),
      }));
    }

    return res.status(200).json({
      weeks: weekCols.map((w) => w.week),
      metrics,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

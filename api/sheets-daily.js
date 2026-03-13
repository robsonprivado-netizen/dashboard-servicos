import { GoogleAuth } from "google-auth-library";
import https from "https";

const SHEET_ID = "1-iFLORoVt9ocMaGa5tLLD7NgoU_3d3TV7KOlNUoRUuw";
const SHEET_NAME = "Diário";

const METRIC_KEYS = [
  "GMV TOTAL",
  "GMV Automático",
  "GMV App",
  "GMV Site",
  "GMV GuideShops",
  "GMV TDV",
  "GMV AVULSO TOTAL",
  "CONVERSÃO GERAL (BUNDLE)",
  "AOV TOTAL",
];

function parseNum(v) {
  if (!v || v === "-" || v === "") return 0;
  let s = String(v).replace(/R\$\s*/g, "").replace(/%/g, "").trim();
  // Brazilian format: "1.234,56" → remove thousand dots, replace comma
  if (/\d,\d/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(s) || 0;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");

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
    const range = encodeURIComponent(`${SHEET_NAME}!A1:ZZ1000`);

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

    // Find header row containing DD/MM dates
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some((c) => /^\d{1,2}\/\d{2}$/.test(c))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return res.status(200).json({ dates: [], metrics: {} });
    }

    const headers = rows[headerIdx];

    // Collect all date columns (DD/MM format)
    const dateCols = [];
    headers.forEach((h, i) => {
      if (/^\d{1,2}\/\d{2}$/.test(h)) dateCols.push({ col: i, date: h });
    });

    // Keep only columns with actual data, then take last 30
    const withData = dateCols.filter(({ col }) =>
      rows.slice(headerIdx + 1).some((r) => r[col] && r[col] !== "0" && r[col] !== "")
    );
    const last30 = withData.slice(-30);

    // Extract metric rows
    const metrics = {};
    for (const row of rows) {
      const name = row[0]?.trim();
      if (!name) continue;
      const key = METRIC_KEYS.find((m) => name === m);
      if (key && !metrics[key]) {
        metrics[key] = last30.map(({ col, date }) => ({
          date,
          value: parseNum(row[col]),
        }));
      }
    }

    return res.status(200).json({
      dates: last30.map((d) => d.date),
      metrics,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

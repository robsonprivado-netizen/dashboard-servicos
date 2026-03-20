import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { WEEKLY as WEEKLY_STATIC, PIE_DATA as PIE_DATA_STATIC, COLORS, C, RAW } from "./data.js";
import KpiCard from "./components/KpiCard.jsx";
import Card from "./components/Card.jsx";
import SectionLabel from "./components/SectionLabel.jsx";
import AnalysisFooter from "./components/AnalysisFooter.jsx";
import DailyAnalysisFooter from "./components/DailyAnalysisFooter.jsx";

const tt = {
  contentStyle:{ background:"#181c24", border:"1px solid #22283a", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:12 },
  labelStyle:{ color:"#e8eaf0", fontWeight:600 },
  itemStyle:{ color:"#9ca3af" }
};

const TABS = [
  { id:"overview", label:"Visão Geral" },
  { id:"canais", label:"Canais" },
  { id:"conversao", label:"Conversão & AOV" },
  { id:"sessoes", label:"Sessões" },
  { id:"diario", label:"Diário" },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const s = (id) => ({ display: tab === id ? "block" : "none" });

  // Dados semanais dinâmicos
  const [weeklyData, setWeeklyData] = useState(null);
  useEffect(() => {
    fetch("/api/sheets-weekly", { credentials: "include" })
      .then(r => r.json())
      .then(d => setWeeklyData(d))
      .catch(() => {});
  }, []);

  // Constrói WEEKLY a partir da API (semanas reais do ano: S6, S7, ..., S12)
  // ou usa fallback estático durante carregamento
  const WEEKLY = (weeklyData?.weeks?.length) ? weeklyData.weeks.map((wk, i) => {
    const m = weeklyData.metrics;
    const weekNum = parseInt(wk.split("/")[0], 10); // número real da semana no ano
    return {
      week: `S${weekNum}`,
      "GMV Total":   m["GMV TOTAL"]?.[i]?.value ?? 0,
      "Automático":  m["GMV Automático"]?.[i]?.value ?? 0,
      "App":         m["GMV App"]?.[i]?.value ?? 0,
      "Site":        m["GMV Site"]?.[i]?.value ?? 0,
      "GuideShops":  m["GMV GuideShops"]?.[i]?.value ?? 0,
      "TDV":         m["GMV TDV"]?.[i]?.value ?? 0,
      "Avulso":      m["GMV AVULSO TOTAL"]?.[i]?.value ?? 0,
      "Conversão %": m["CONVERSÃO GERAL (BUNDLE)"]?.[i]?.value ?? 0,
      "AOV":         m["AOV TOTAL"]?.[i]?.value ?? 0,
      "AOV TDV":     m["AOV TDV"]?.[i]?.value ?? 0,
      "AOV GS":      m["AOV GuideShops"]?.[i]?.value ?? 0,
      "App Sess":    m["Sessões App"]?.[i]?.value ?? 0,
      "Site Sess":   m["Sessões Site"]?.[i]?.value ?? 0,
    };
  }) : WEEKLY_STATIC;

  const PIE_DATA = (() => {
    const last = WEEKLY[WEEKLY.length - 1] || {};
    return [
      { name: "App",        value: last["App"]        || 0 },
      { name: "Site",       value: last["Site"]        || 0 },
      { name: "GuideShops", value: last["GuideShops"]  || 0 },
      { name: "TDV",        value: last["TDV"]         || 0 },
      { name: "Avulso",     value: last["Avulso"]      || 0 },
    ];
  })();

  // Helpers para KPIs da última semana
  const lastW = WEEKLY[WEEKLY.length - 1] || {};
  const prevW = WEEKLY[WEEKLY.length - 2] || {};
  const wowPctW = (k) => prevW[k] ? ((lastW[k] - prevW[k]) / prevW[k] * 100) : null;
  const wowStrW = (k) => { const v = wowPctW(k); return v != null ? `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}% WoW` : "—"; };
  const wowUpW  = (k) => { const v = wowPctW(k); return v != null ? v >= 0 : true; };
  const fmtK    = (v) => v ? `R$${Math.round(v).toLocaleString("pt-BR")}k` : "—";
  const fmtPct  = (v) => v ? `${v.toFixed(1)}%` : "—";
  const fmtR    = (v) => v ? `R$${Math.round(v).toLocaleString("pt-BR")}` : "—";
  const lastWeekLabel = lastW.week || "S?";
  const firstWeekLabel = WEEKLY[0]?.week || "S1";

  // RAW dinâmico para tabela de canais
  const RAW_W = {
    gmvTotal:  WEEKLY.map(w => w["GMV Total"]),
    gmvAuto:   WEEKLY.map(w => w["Automático"]),
    gmvApp:    WEEKLY.map(w => w["App"]),
    gmvSite:   WEEKLY.map(w => w["Site"]),
    gmvGS:     WEEKLY.map(w => w["GuideShops"]),
    gmvTDV:    WEEKLY.map(w => w["TDV"]),
    gmvAvulso: WEEKLY.map(w => w["Avulso"]),
  };

  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (tab !== "diario" || dailyData) return;
    setDailyLoading(true);
    fetch("/api/sheets-daily")
      .then(r => r.json())
      .then(d => {
        setDailyData(d);
        setDailyLoading(false);
        if (d.dates?.length) setSelectedDate(d.dates[d.dates.length - 1]);
      })
      .catch(e => { setDailyError(e.message); setDailyLoading(false); });
  }, [tab]);

  const dailyChartData = dailyData ? dailyData.dates.map((date, i) => {
    const m = dailyData.metrics;
    return {
      date,
      "GMV Total": m["GMV TOTAL"]?.[i]?.value ?? 0,
      "Automático": m["GMV Automático"]?.[i]?.value ?? 0,
      "App": m["GMV App"]?.[i]?.value ?? 0,
      "Site": m["GMV Site"]?.[i]?.value ?? 0,
      "GuideShops": m["GMV GuideShops"]?.[i]?.value ?? 0,
      "TDV": m["GMV TDV"]?.[i]?.value ?? 0,
      "Avulso": m["GMV AVULSO TOTAL"]?.[i]?.value ?? 0,
      "Conversão %": m["CONVERSÃO GERAL (BUNDLE)"]?.[i]?.value ?? 0,
      "AOV": m["AOV TOTAL"]?.[i]?.value ?? 0,
    };
  }) : [];

  const dlast = dailyChartData[dailyChartData.length - 1] || {};

  // Índice do dia selecionado (padrão: último dia)
  const selIdx = (selectedDate && dailyChartData.length > 0)
    ? Math.max(0, dailyChartData.findIndex(d => d.date === selectedDate))
    : dailyChartData.length - 1;
  const dsel = dailyChartData[selIdx] || {};
  const dselPrev = dailyChartData[selIdx - 1] || {};

  // AOV outlier filter (global para o gráfico)
  const aovNonZero = dailyChartData.filter(d => d["AOV"] > 0);
  const aovSorted = aovNonZero.map(d => d["AOV"]).sort((a, b) => a - b);
  const aovP80 = aovSorted[Math.floor(aovSorted.length * 0.8)] || 500;
  const aovChartData = aovNonZero.filter(d => d["AOV"] <= aovP80 * 2);

  // AOV: último valor válido até o dia selecionado
  const lastAovDay = dailyChartData.slice(0, selIdx + 1)
    .filter(d => d["AOV"] > 0 && d["AOV"] <= aovP80 * 2).reverse()[0] || {};
  const aovValue = lastAovDay["AOV"] ?? 0;
  const aovDate = lastAovDay["date"] ?? null;

  // DoD: dia selecionado vs dia anterior
  const dod = (k) => dselPrev[k] ? (((dsel[k] - dselPrev[k]) / dselPrev[k]) * 100).toFixed(1) : null;
  const dodPill = (k) => { const v = dod(k); return v ? `${parseFloat(v) >= 0 ? "▲" : "▼"} ${Math.abs(parseFloat(v))}% DoD` : "—"; };
  const dodUp = (k) => { const v = dod(k); return v ? parseFloat(v) >= 0 : true; };

  // WoW: 7 dias terminando no dia selecionado vs 7 anteriores
  const sel7 = dailyChartData.slice(Math.max(0, selIdx - 6), selIdx + 1);
  const selPrev7 = dailyChartData.slice(Math.max(0, selIdx - 13), Math.max(0, selIdx - 6));
  const wsum = (arr, k) => arr.reduce((s, d) => s + (d[k] || 0), 0);
  const wowPct = (k) => { const c = wsum(sel7, k), p = wsum(selPrev7, k); return p > 0 ? (c - p) / p * 100 : null; };
  const wowStr = (k) => { const v = wowPct(k); return v != null ? `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}% WoW` : "—"; };
  const wowUp = (k) => { const v = wowPct(k); return v != null ? v >= 0 : true; };

  // Vs Meta — mapeamento de chart key → API key
  const VM_MAP = {
    "GMV Total": "GMV TOTAL", "Automático": "GMV Automático", "App": "GMV App",
    "Site": "GMV Site", "GuideShops": "GMV GuideShops", "TDV": "GMV TDV",
    "Avulso": "GMV AVULSO TOTAL", "Conversão %": "CONVERSÃO GERAL (BUNDLE)", "AOV": "AOV TOTAL",
  };
  const vmStr = (k) => { const v = dailyData?.vsMeta?.[VM_MAP[k]]; return v ? `Meta ${v}` : null; };
  const subStr = (k) => [dodPill(k), vmStr(k)].filter(Boolean).join(" · ");

  return (
    <div style={{ background:"#0a0c10", color:"#e8eaf0", minHeight:"100vh" }}>
      <div style={{ maxWidth:1300, margin:"0 auto", padding:"32px 20px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:36, paddingBottom:24, borderBottom:"1px solid #22283a", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.5px" }}>
              Report Comercial <span style={{ color:C.green }}>Serviços</span> 2026
            </h1>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", marginTop:6, letterSpacing:"0.05em" }}>SEMANAL · {firstWeekLabel}–{lastWeekLabel} · DADOS EM R$k</p>
          </div>
          <span style={{ background:"rgba(0,229,160,0.1)", border:"1px solid rgba(0,229,160,0.3)", color:C.green, fontFamily:"'DM Mono',monospace", fontSize:11, padding:"6px 12px", borderRadius:4 }}>{wowStrW("GMV Total")} · {lastWeekLabel}</span>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:28, background:"#111318", padding:4, borderRadius:8, border:"1px solid #22283a", width:"fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"7px 18px", borderRadius:6, border:"none", background: tab===t.id ? "#181c24" : "transparent", color: tab===t.id ? "#e8eaf0" : "#6b7280", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        <div style={s("overview")}>
          <SectionLabel>KPIs Principais — {lastWeekLabel}/2026</SectionLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label="GMV Total"      value={fmtK(lastW["GMV Total"])}   pill={wowStrW("GMV Total")}   pillUp={wowUpW("GMV Total")}   color="green" />
            <KpiCard label="GMV Automático" value={fmtK(lastW["Automático"])}  pill={wowStrW("Automático")}  pillUp={wowUpW("Automático")}  color="blue" />
            <KpiCard label="GMV GuideShops" value={fmtK(lastW["GuideShops"])}  pill={wowStrW("GuideShops")}  pillUp={wowUpW("GuideShops")}  color="yellow" />
            <KpiCard label="GMV TDV"        value={fmtK(lastW["TDV"])}         pill={wowStrW("TDV")}         pillUp={wowUpW("TDV")}         color="orange" />
            <KpiCard label="GMV Avulso"     value={fmtK(lastW["Avulso"])}      pill={wowStrW("Avulso")}      pillUp={wowUpW("Avulso")}      color="green" />
            <KpiCard label="Conversão Geral" value={fmtPct(lastW["Conversão %"])} pill={wowStrW("Conversão %")} pillUp={wowUpW("Conversão %")} color="blue" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="GMV Total — Evolução Semanal" subtitle={`R$k · ${firstWeekLabel}–${lastWeekLabel}/2026`}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={WEEKLY}>
                  <defs><linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} />
                  <Area type="monotone" dataKey="GMV Total" stroke={C.green} fill="url(#gGreen)" strokeWidth={2} dot={{ r:3, fill:C.green }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Mix de Canais" subtitle={`Share GMV — ${lastWeekLabel}`}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {PIE_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip {...tt} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", marginTop:8 }}>
                {PIE_DATA.map((d,i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:"'DM Mono',monospace", fontSize:11, color:"#9ca3af" }}><div style={{ width:8, height:8, borderRadius:2, background:COLORS[i] }} />{d.name}</div>)}
              </div>
            </Card>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Card title="GMV Empilhado por Canal" subtitle="R$k">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={WEEKLY}>
                  <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} />
                  <Legend wrapperStyle={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#9ca3af" }} />
                  <Bar dataKey="Automático" stackId="a" fill={C.green+"bb"} />
                  <Bar dataKey="GuideShops" stackId="a" fill={C.yellow+"bb"} />
                  <Bar dataKey="TDV" stackId="a" fill={C.orange+"bb"} />
                  <Bar dataKey="Avulso" stackId="a" fill={C.purple+"bb"} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Insights Rápidos" subtitle="Destaques da semana 9">
              {[
                { c:C.green, icon:"🚀", title:"YoY +59%", text:"R$1.098k (S10/2026) — 2° maior do período" },
                { c:C.green, icon:"📈", title:"Conversão recorde", text:"De 19,1% (S1) → 23,6% (S10) — recorde!" },
                { c:C.yellow, icon:"⚠️", title:"Pico na S2", text:"R$1.037k; recuo nas semanas seguintes" },
                { c:C.orange, icon:"💰", title:"AOV em queda", text:"Pico S7 (R$404) → R$240 (S10), compressão" },
              ].map((ins,i) => (
                <div key={i} style={{ borderLeft:`3px solid ${ins.c}`, paddingLeft:12, marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:ins.c, marginBottom:2 }}>{ins.icon} {ins.title}</div>
                  <div style={{ fontSize:12, color:"#9ca3af" }}>{ins.text}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* CANAIS */}
        <div style={s("canais")}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label={`App (${lastWeekLabel})`}        value={fmtK(lastW["App"])}        pill={wowStrW("App")}        pillUp={wowUpW("App")}        color="green" />
            <KpiCard label={`Site (${lastWeekLabel})`}       value={fmtK(lastW["Site"])}       pill={wowStrW("Site")}       pillUp={wowUpW("Site")}       color="blue" />
            <KpiCard label={`GuideShops (${lastWeekLabel})`} value={fmtK(lastW["GuideShops"])} pill={wowStrW("GuideShops")} pillUp={wowUpW("GuideShops")} color="yellow" />
            <KpiCard label={`TDV (${lastWeekLabel})`}        value={fmtK(lastW["TDV"])}        pill={wowStrW("TDV")}        pillUp={wowUpW("TDV")}        color="orange" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="App vs Site" subtitle="R$k">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={WEEKLY}>
                  <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                  <Line type="monotone" dataKey="App" stroke={C.green} strokeWidth={2} dot={{ r:3 }} />
                  <Line type="monotone" dataKey="Site" stroke={C.blue} strokeWidth={2} dot={{ r:3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="GuideShops vs TDV" subtitle="R$k">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={WEEKLY}>
                  <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar dataKey="GuideShops" fill={C.yellow+"bb"} radius={[3,3,0,0]} />
                  <Bar dataKey="TDV" fill={C.orange+"bb"} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card title="Tabela GMV por Canal" subtitle={`R$k · ${firstWeekLabel}–${lastWeekLabel}/2026`}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                <thead>
                  <tr>{["Canal", ...WEEKLY.map(w => w.week), "Total", "WoW"].map(h => <th key={h} style={{ padding:"8px 10px", borderBottom:"1px solid #22283a", color:"#6b7280", textAlign:h==="Canal"?"left":"right", fontSize:11 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[
                    { name:"Total",      key:"GMV Total",   d:RAW_W.gmvTotal },
                    { name:"Automático", key:"Automático",  d:RAW_W.gmvAuto },
                    { name:"App",        key:"App",         d:RAW_W.gmvApp },
                    { name:"Site",       key:"Site",        d:RAW_W.gmvSite },
                    { name:"GuideShops", key:"GuideShops",  d:RAW_W.gmvGS },
                    { name:"TDV",        key:"TDV",         d:RAW_W.gmvTDV },
                    { name:"Avulso",     key:"Avulso",      d:RAW_W.gmvAvulso },
                  ].map((row,i) => {
                    const pct = wowPctW(row.key);
                    const up = pct != null ? pct >= 0 : true;
                    const wowLabel = pct != null ? `${up ? "+" : ""}${pct.toFixed(1)}%` : "—";
                    return (
                      <tr key={i}>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", fontWeight:i===0?700:400 }}>{row.name}</td>
                        {row.d.map((v,j) => <td key={j} style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right", color:"#9ca3af" }}>{Math.round(v).toLocaleString("pt-BR")}</td>)}
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right" }}>{Math.round(row.d.reduce((a,b)=>a+b,0)).toLocaleString("pt-BR")}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right" }}><span style={{ background:up?"rgba(0,229,160,0.12)":"rgba(255,107,74,0.12)", color:up?C.green:C.orange, padding:"2px 7px", borderRadius:100, fontSize:11 }}>{wowLabel}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* CONVERSÃO & AOV */}
        <div style={s("conversao")}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label={`Conversão ${lastWeekLabel}`} value={fmtPct(lastW["Conversão %"])} pill={wowStrW("Conversão %")} pillUp={wowUpW("Conversão %")} color="green" />
            <KpiCard label={`AOV Total ${lastWeekLabel}`} value={fmtR(lastW["AOV"])}            pill={wowStrW("AOV")}          pillUp={wowUpW("AOV")}          color="blue" />
            <KpiCard label={`AOV TDV ${lastWeekLabel}`}   value={fmtR(lastW["AOV TDV"])}        pill={wowStrW("AOV TDV")}      pillUp={wowUpW("AOV TDV")}      color="yellow" />
            <KpiCard label={`AOV GS ${lastWeekLabel}`}    value={fmtR(lastW["AOV GS"])}          pill={wowStrW("AOV GS")}       pillUp={wowUpW("AOV GS")}       color="orange" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="Taxa de Conversão Geral" subtitle={`% Bundle · ${firstWeekLabel}–${lastWeekLabel}`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={WEEKLY}>
                  <defs><linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[17,25]} tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} />
                  <Area type="monotone" dataKey="Conversão %" stroke={C.green} fill="url(#gConv)" strokeWidth={2} dot={{ r:3, fill:C.green }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card title="AOV por Canal — S9" subtitle="R$ ticket médio">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ canal:"TDV", aov:278 },{ canal:"Avulso", aov:276 },{ canal:"Total", aov:247 },{ canal:"Auto", aov:233 },{ canal:"GS", aov:233 }]}>
                  <XAxis dataKey="canal" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[200,380]} tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} />
                  <Bar dataKey="aov" fill={C.blue+"cc"} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card title="Evolução AOV por Canal" subtitle={`R$ — ${firstWeekLabel}–${lastWeekLabel}`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={WEEKLY}>
                <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                <Line type="monotone" dataKey="AOV" stroke={C.blue} strokeWidth={2} dot={{ r:3 }} />
                <Line type="monotone" dataKey="AOV TDV" stroke={C.orange} strokeWidth={2} dot={{ r:3 }} />
                <Line type="monotone" dataKey="AOV GS" stroke={C.yellow} strokeWidth={2} dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* SESSÕES */}
        <div style={s("sessoes")}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label={`Sessões App ${lastWeekLabel}`}  value={lastW["App Sess"]  ? `${lastW["App Sess"].toFixed(2)}M`  : "—"} pill={wowStrW("App Sess")}  pillUp={wowUpW("App Sess")}  color="green" />
            <KpiCard label={`Sessões Site ${lastWeekLabel}`} value={lastW["Site Sess"] ? `${lastW["Site Sess"].toFixed(2)}M` : "—"} pill={wowStrW("Site Sess")} pillUp={wowUpW("Site Sess")} color="blue" />
            <KpiCard label={`Total ${lastWeekLabel}`} value={lastW["App Sess"] && lastW["Site Sess"] ? `${(lastW["App Sess"] + lastW["Site Sess"]).toFixed(2)}M` : "—"} pill={wowStrW("App Sess")} pillUp={wowUpW("App Sess")} color="yellow" />
            <KpiCard label="Split App/Site" value={lastW["App Sess"] && lastW["Site Sess"] ? `${Math.round(lastW["App Sess"]/(lastW["App Sess"]+lastW["Site Sess"])*100)}/${Math.round(lastW["Site Sess"]/(lastW["App Sess"]+lastW["Site Sess"])*100)}` : "—"} sub="% de sessões" color="orange" />
          </div>
          <Card title="Sessões App vs Site por Semana" subtitle="Milhões">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={WEEKLY}>
                <XAxis dataKey="week" tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="App Sess" stackId="s" fill={C.green+"aa"} />
                <Bar dataKey="Site Sess" stackId="s" fill={C.blue+"aa"} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* DIÁRIO */}
        <div style={s("diario")}>
          {dailyLoading && (
            <div style={{ textAlign:"center", padding:80, color:"#6b7280", fontFamily:"'DM Mono',monospace", fontSize:13 }}>
              Carregando dados diários...
            </div>
          )}
          {dailyError && (
            <div style={{ textAlign:"center", padding:80, color:"#ff6b4a", fontFamily:"'DM Mono',monospace" }}>
              Erro: {dailyError}
            </div>
          )}
          {dailyData && dailyChartData.length > 0 && (
            <>
              {/* Filtro de data */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", letterSpacing:"0.08em", textTransform:"uppercase" }}>Dia</span>
                <select
                  value={selectedDate || ""}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ background:"#111318", border:"1px solid #22283a", color:"#e8eaf0", borderRadius:6, padding:"7px 12px", fontSize:12, fontFamily:"'DM Mono',monospace", cursor:"pointer", outline:"none" }}
                >
                  {dailyData.dates.map(d => (
                    <option key={d} value={d}>{d}/2026</option>
                  ))}
                </select>
                {selectedDate && selectedDate !== dailyData.dates[dailyData.dates.length - 1] && (
                  <button
                    onClick={() => setSelectedDate(dailyData.dates[dailyData.dates.length - 1])}
                    style={{ background:"transparent", border:"1px solid #22283a", color:"#6b7280", borderRadius:6, padding:"7px 12px", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}
                  >
                    ← Último dia
                  </button>
                )}
              </div>

              {/* KPIs principais */}
              <SectionLabel>KPIs do Dia — {selectedDate || dlast["date"]}/2026</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:28 }}>
                <KpiCard label="GMV Total" value={`R$${dsel["GMV Total"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("GMV Total")} pillUp={wowUp("GMV Total")} color="green" sub={subStr("GMV Total")} />
                <KpiCard label="Conversão Geral" value={`${dsel["Conversão %"]?.toFixed(1) ?? "—"}%`} pill={wowStr("Conversão %")} pillUp={wowUp("Conversão %")} color="blue" sub={subStr("Conversão %")} />
                <KpiCard label="AOV Total" value={aovValue ? `R$${aovValue.toLocaleString("pt-BR")}` : "—"} pill={wowStr("AOV")} pillUp={wowUp("AOV")} color="yellow" sub={[aovDate && aovDate !== dsel["date"] ? `último dado: ${aovDate}` : null, dodPill("AOV") !== "—" ? dodPill("AOV") : null, vmStr("AOV")].filter(Boolean).join(" · ") || subStr("AOV")} />
              </div>

              {/* KPIs por canal */}
              <SectionLabel>GMV por Canal — {selectedDate || dlast["date"]}/2026</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
                <KpiCard label="App" value={`R$${dsel["App"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("App")} pillUp={wowUp("App")} color="green" sub={subStr("App")} />
                <KpiCard label="Site" value={`R$${dsel["Site"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("Site")} pillUp={wowUp("Site")} color="blue" sub={subStr("Site")} />
                <KpiCard label="GuideShops" value={`R$${dsel["GuideShops"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("GuideShops")} pillUp={wowUp("GuideShops")} color="yellow" sub={subStr("GuideShops")} />
                <KpiCard label="TDV" value={`R$${dsel["TDV"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("TDV")} pillUp={wowUp("TDV")} color="orange" sub={subStr("TDV")} />
                <KpiCard label="Avulso" value={`R$${dsel["Avulso"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("Avulso")} pillUp={wowUp("Avulso")} color="green" sub={subStr("Avulso")} />
              </div>

              {/* GMV Total + Conversão */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
                <Card title="GMV Total — Evolução Diária" subtitle={`Últimos ${dailyChartData.length} dias`}>
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={dailyChartData}>
                      <defs><linearGradient id="gGreenD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} />
                      <Area type="monotone" dataKey="GMV Total" stroke={C.green} fill="url(#gGreenD)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Conversão Diária" subtitle="%">
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={dailyChartData}>
                      <defs><linearGradient id="gConvD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.2}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} />
                      <Area type="monotone" dataKey="Conversão %" stroke={C.blue} fill="url(#gConvD)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Canais empilhado + App vs Site */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <Card title="GMV por Canal — Diário" subtitle="Empilhado">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyChartData}>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} />
                      <Legend wrapperStyle={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#9ca3af" }} />
                      <Bar dataKey="App" stackId="a" fill={C.green+"bb"} />
                      <Bar dataKey="Site" stackId="a" fill={C.blue+"bb"} />
                      <Bar dataKey="GuideShops" stackId="a" fill={C.yellow+"bb"} />
                      <Bar dataKey="TDV" stackId="a" fill={C.orange+"bb"} />
                      <Bar dataKey="Avulso" stackId="a" fill={C.purple+"bb"} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="App vs Site" subtitle="R$k diário">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyChartData}>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                      <Line type="monotone" dataKey="App" stroke={C.green} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Site" stroke={C.blue} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* GuideShops vs TDV + AOV */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <Card title="GuideShops vs TDV" subtitle="R$k diário">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyChartData}>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:11 }} />
                      <Line type="monotone" dataKey="GuideShops" stroke={C.yellow} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="TDV" stroke={C.orange} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="AOV Diário" subtitle="R$ ticket médio">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={aovChartData}>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis domain={["auto","auto"]} tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} />
                      <Line type="monotone" dataKey="AOV" stroke={C.blue} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Tabela 7 dias terminando no dia selecionado */}
              <Card title={`7 Dias até ${selectedDate || dlast["date"]}`} subtitle="com WoW">
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                    <thead>
                      <tr>
                        {["Canal", ...sel7.map(d => d.date), "WoW"].map(h => (
                          <th key={h} style={{ padding:"8px 10px", borderBottom:"1px solid #22283a", color:"#6b7280", textAlign:h==="Canal"?"left":"right", fontSize:11, fontWeight: h === selectedDate ? 800 : 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name:"GMV Total", key:"GMV Total", bold:true },
                        { name:"App",        key:"App" },
                        { name:"Site",       key:"Site" },
                        { name:"GuideShops", key:"GuideShops" },
                        { name:"TDV",        key:"TDV" },
                        { name:"Avulso",     key:"Avulso" },
                        { name:"Conversão %",key:"Conversão %" },
                        { name:"AOV",        key:"AOV" },
                      ].map((row, i) => {
                        const days7 = sel7;
                        const w = wowPct(row.key);
                        return (
                          <tr key={i}>
                            <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", fontWeight:row.bold?700:400 }}>{row.name}</td>
                            {days7.map((d, j) => (
                              <td key={j} style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right", color:"#9ca3af" }}>
                                {row.key === "Conversão %" ? `${d[row.key]?.toFixed(1)}%` : row.key === "AOV" ? (d[row.key] > 0 ? d[row.key].toLocaleString("pt-BR") : "—") : d[row.key]?.toLocaleString("pt-BR")}
                              </td>
                            ))}
                            <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right" }}>
                              {w != null ? <span style={{ background:w>=0?"rgba(0,229,160,0.12)":"rgba(255,107,74,0.12)", color:w>=0?C.green:C.orange, padding:"2px 7px", borderRadius:100, fontSize:11 }}>{w>=0?"▲":"▼"} {Math.abs(w).toFixed(1)}%</span> : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <DailyAnalysisFooter dailyData={dailyData} dailyChartData={dailyChartData} />
            </>
          )}
          {dailyData && dailyChartData.length === 0 && !dailyLoading && (
            <div style={{ textAlign:"center", padding:80, color:"#6b7280", fontFamily:"'DM Mono',monospace" }}>
              Nenhum dado encontrado na aba "Diário"
            </div>
          )}
        </div>

        {/* AI FOOTER */}
        <AnalysisFooter />

      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { WEEKLY, PIE_DATA, COLORS, C, RAW } from "./data.js";
import KpiCard from "./components/KpiCard.jsx";
import Card from "./components/Card.jsx";
import SectionLabel from "./components/SectionLabel.jsx";
import AnalysisFooter from "./components/AnalysisFooter.jsx";

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

  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(null);

  useEffect(() => {
    if (tab !== "diario" || dailyData) return;
    setDailyLoading(true);
    fetch("/api/sheets-daily")
      .then(r => r.json())
      .then(d => { setDailyData(d); setDailyLoading(false); })
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
  const dprev = dailyChartData[dailyChartData.length - 2] || {};
  const dod = (k) => dprev[k] ? (((dlast[k] - dprev[k]) / dprev[k]) * 100).toFixed(1) : null;
  const dodPill = (k) => { const v = dod(k); return v ? `${parseFloat(v) >= 0 ? "▲" : "▼"} ${Math.abs(parseFloat(v))}% DoD` : "—"; };
  const dodUp = (k) => { const v = dod(k); return v ? parseFloat(v) >= 0 : true; };

  // WoW: últimos 7 dias vs 7 dias anteriores
  const last7 = dailyChartData.slice(-7);
  const prev7 = dailyChartData.slice(-14, -7);
  const wsum = (arr, k) => arr.reduce((s, d) => s + (d[k] || 0), 0);
  const wowPct = (k) => { const c = wsum(last7, k), p = wsum(prev7, k); return p > 0 ? (c - p) / p * 100 : null; };
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
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", marginTop:6, letterSpacing:"0.05em" }}>SEMANAL · SEMANAS 1–9 · DADOS EM R$k</p>
          </div>
          <span style={{ background:"rgba(0,229,160,0.1)", border:"1px solid rgba(0,229,160,0.3)", color:C.green, fontFamily:"'DM Mono',monospace", fontSize:11, padding:"6px 12px", borderRadius:4 }}>▲ WoW +17,6% · S10 Recorde</span>
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
          <SectionLabel>KPIs Principais — Semana 10/2026</SectionLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label="GMV Total" value="R$1.098k" pill="▲ 17,6% WoW" pillUp color="green" sub="vs Meta +116%" />
            <KpiCard label="GMV Automático" value="R$598k" pill="▲ 13,9% WoW" pillUp color="blue" sub="vs Meta +145%" />
            <KpiCard label="GMV GuideShops" value="R$306k" pill="▲ 23,6% WoW" pillUp color="yellow" sub="vs Meta +103%" />
            <KpiCard label="GMV TDV" value="R$161k" pill="▲ 25,8% WoW" pillUp color="orange" sub="vs Meta +108%" />
            <KpiCard label="GMV Avulso" value="R$60k" pill="▼ 18,0% WoW" pillUp={false} color="green" sub="vs Meta +90%" />
            <KpiCard label="Conversão Geral" value="23,6%" pill="▲ recorde do período" pillUp color="blue" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="GMV Total — Evolução Semanal" subtitle="R$k · Semanas 1–9/2026">
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
            <Card title="Mix de Canais" subtitle="Share GMV — Semana 9">
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
            <KpiCard label="App (S10)" value="R$306k" pill="▲ 19,5% WoW" pillUp pillUp={false} color="green" />
            <KpiCard label="Site (S10)" value="R$277k" pill="▲ 6,2% WoW" pillUp color="blue" />
            <KpiCard label="GuideShops (S9)" value="R$306k" pill="▲ 23,6% WoW" pillUp color="yellow" />
            <KpiCard label="TDV (S9)" value="R$161k" pill="▲ 25,8% WoW" pillUp color="orange" />
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
          <Card title="Tabela GMV por Canal" subtitle="R$k · Semanas 1–9/2026">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                <thead>
                  <tr>{["Canal","S1","S2","S3","S4","S5","S6","S7","S8","S9","Total","WoW"].map(h => <th key={h} style={{ padding:"8px 10px", borderBottom:"1px solid #22283a", color:"#6b7280", textAlign:h==="Canal"?"left":"right", fontSize:11 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[
                    { name:"Total", d:RAW.gmvTotal, wow:"+17,6%", up:true },
                    { name:"Automático", d:RAW.gmvAuto, wow:"+13,9%", up:true },
                    { name:"App", d:RAW.gmvApp, wow:"+19,5%", up:true },
                    { name:"Site", d:RAW.gmvSite, wow:"+7,3%", up:true },
                    { name:"GuideShops", d:RAW.gmvGS, wow:"+23,6%", up:true },
                    { name:"TDV", d:RAW.gmvTDV, wow:"+25,8%", up:true },
                    { name:"Avulso", d:RAW.gmvAvulso, wow:"-18,0%", up:false },
                  ].map((row,i) => (
                    <tr key={i}>
                      <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", fontWeight:i===0?700:400 }}>{row.name}</td>
                      {row.d.map((v,j) => <td key={j} style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right", color:"#9ca3af" }}>{v.toLocaleString("pt-BR")}</td>)}
                      <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right" }}>{row.d.reduce((a,b)=>a+b,0).toLocaleString("pt-BR")}</td>
                      <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right" }}><span style={{ background:row.up?"rgba(0,229,160,0.12)":"rgba(255,107,74,0.12)", color:row.up?C.green:C.orange, padding:"2px 7px", borderRadius:100, fontSize:11 }}>{row.wow}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* CONVERSÃO & AOV */}
        <div style={s("conversao")}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
            <KpiCard label="Conversão S9" value="23,6%" pill="▲ recorde do período" pillUp color="green" />
            <KpiCard label="AOV Total S10" value="R$240" pill="▼ vs R$278 pico" pillUp={false} color="blue" />
            <KpiCard label="AOV TDV S10" value="R$264" sub="maior ticket" color="yellow" />
            <KpiCard label="AOV Avulso S10" value="R$236" pill="▲ vs R$223 S1" pillUp color="orange" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="Taxa de Conversão Geral" subtitle="% Bundle · S1–S9">
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
          <Card title="Evolução AOV por Canal" subtitle="R$ — Semanas 1–9">
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
            <KpiCard label="Sessões App S10" value="1,85M" pill="▲ 248% vs 2025" pillUp color="green" />
            <KpiCard label="Sessões Site S10" value="3,12M" pill="▲ 257% vs 2025" pillUp color="blue" />
            <KpiCard label="Total S10" value="4,97M" pill="▲ 253% vs 2025" pillUp color="yellow" />
            <KpiCard label="Split App/Site" value="39/61" sub="% de sessões" color="orange" />
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
              {/* KPIs principais */}
              <SectionLabel>KPIs do Dia — {dailyData.dates[dailyData.dates.length - 1]}/2026</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:28 }}>
                <KpiCard label="GMV Total" value={`R$${dlast["GMV Total"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("GMV Total")} pillUp={wowUp("GMV Total")} color="green" sub={subStr("GMV Total")} />
                <KpiCard label="Conversão Geral" value={`${dlast["Conversão %"]?.toFixed(1) ?? "—"}%`} pill={wowStr("Conversão %")} pillUp={wowUp("Conversão %")} color="blue" sub={subStr("Conversão %")} />
                <KpiCard label="AOV Total" value={`R$${dlast["AOV"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("AOV")} pillUp={wowUp("AOV")} color="yellow" sub={subStr("AOV")} />
              </div>

              {/* KPIs por canal */}
              <SectionLabel>GMV por Canal — Último Dia</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
                <KpiCard label="App" value={`R$${dlast["App"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("App")} pillUp={wowUp("App")} color="green" sub={subStr("App")} />
                <KpiCard label="Site" value={`R$${dlast["Site"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("Site")} pillUp={wowUp("Site")} color="blue" sub={subStr("Site")} />
                <KpiCard label="GuideShops" value={`R$${dlast["GuideShops"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("GuideShops")} pillUp={wowUp("GuideShops")} color="yellow" sub={subStr("GuideShops")} />
                <KpiCard label="TDV" value={`R$${dlast["TDV"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("TDV")} pillUp={wowUp("TDV")} color="orange" sub={subStr("TDV")} />
                <KpiCard label="Avulso" value={`R$${dlast["Avulso"]?.toLocaleString("pt-BR") ?? "—"}`} pill={wowStr("Avulso")} pillUp={wowUp("Avulso")} color="green" sub={subStr("Avulso")} />
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
                    <LineChart data={dailyChartData}>
                      <XAxis dataKey="date" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tt} />
                      <Line type="monotone" dataKey="AOV" stroke={C.blue} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Tabela últimos 7 dias */}
              <Card title="Últimos 7 Dias por Canal" subtitle="com WoW">
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                    <thead>
                      <tr>
                        {["Canal", ...dailyChartData.slice(-7).map(d => d.date), "WoW"].map(h => (
                          <th key={h} style={{ padding:"8px 10px", borderBottom:"1px solid #22283a", color:"#6b7280", textAlign:h==="Canal"?"left":"right", fontSize:11 }}>{h}</th>
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
                        const days7 = dailyChartData.slice(-7);
                        const w = wowPct(row.key);
                        return (
                          <tr key={i}>
                            <td style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", fontWeight:row.bold?700:400 }}>{row.name}</td>
                            {days7.map((d, j) => (
                              <td key={j} style={{ padding:"9px 10px", borderBottom:"1px solid #0f1219", textAlign:"right", color:"#9ca3af" }}>
                                {row.key === "Conversão %" ? `${d[row.key]?.toFixed(1)}%` : d[row.key]?.toLocaleString("pt-BR")}
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

import { useState } from "react";
import { BUSINESS_DATA, SYSTEM_PROMPT, C } from "../data.js";

function TrendBadge({ tipo }) {
  const cfg = tipo === "crescimento consistente"
    ? { bg:"rgba(0,229,160,0.12)", color:C.green, label:"▲ CRESCIMENTO" }
    : tipo === "queda consistente"
    ? { bg:"rgba(255,107,74,0.12)", color:C.orange, label:"▼ QUEDA" }
    : { bg:"rgba(255,209,102,0.12)", color:C.yellow, label:"~ VOLATILIDADE" };
  return <span style={{ background:cfg.bg, color:cfg.color, fontFamily:"'DM Mono',monospace", fontSize:10, padding:"2px 8px", borderRadius:4, letterSpacing:"0.06em" }}>{cfg.label}</span>;
}

function SectionBlock({ num, title, accentColor, children }) {
  return (
    <div style={{ background:"#111318", border:"1px solid #22283a", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 20px", borderBottom:"1px solid #22283a", background:"#181c24" }}>
        <div style={{ width:24, height:24, borderRadius:6, background:`${accentColor}22`, color:accentColor, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:600, flexShrink:0 }}>{num}</div>
        <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:accentColor }}>{title}</div>
      </div>
      <div style={{ padding:"18px 20px", fontSize:13, lineHeight:1.7, color:"#c5c9d6" }}>{children}</div>
    </div>
  );
}

export default function AnalysisFooter() {
  const [status, setStatus] = useState("idle");
  const [analysis, setAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

  async function generate() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role:"user", content:`Analise os dados e retorne o JSON:\n\n${BUSINESS_DATA}` }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content.map(b => b.text || "").join("");
      const clean = raw.replace(/```json|```/g,"").trim();
      setAnalysis(JSON.parse(clean));
      setStatus("done");
    } catch(e) {
      setErrorMsg(e.message || "Erro desconhecido.");
      setStatus("error");
    }
  }

  return (
    <div style={{ borderTop:"1px solid #22283a", marginTop:48, paddingTop:40 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px" }}>Análise Executiva Estratégica</h2>
          <span style={{ background:"rgba(0,229,160,0.1)", border:"1px solid rgba(0,229,160,0.3)", color:C.green, fontFamily:"'DM Mono',monospace", fontSize:10, padding:"4px 10px", borderRadius:4, letterSpacing:"0.1em" }}>✦ IA ANALISTA</span>
        </div>
        <button onClick={generate} disabled={status==="loading"} style={{ display:"flex", alignItems:"center", gap:8, background:`linear-gradient(135deg,${C.green},#00b37e)`, color:"#0a0c10", border:"none", padding:"11px 22px", borderRadius:8, fontWeight:700, fontSize:14, cursor: status==="loading" ? "not-allowed" : "pointer", opacity: status==="loading" ? 0.6 : 1 }}>
          {status==="loading" ? "⟳ Gerando..." : status==="done" ? "◈ Regenerar" : "◈ Gerar Análise Executiva"}
        </button>
      </div>

      {status==="loading" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, padding:48, color:"#6b7280", fontFamily:"'DM Mono',monospace", fontSize:13 }}>
          <div style={{ width:20, height:20, border:"2px solid #22283a", borderTopColor:C.green, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          Analisando dados de performance...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {status==="error" && (
        <div style={{ background:"rgba(255,107,74,0.08)", border:"1px solid rgba(255,107,74,0.25)", borderRadius:8, padding:"14px 18px", color:C.orange, fontFamily:"'DM Mono',monospace", fontSize:12, marginBottom:16 }}>
          ⚠ {errorMsg}
        </div>
      )}

      {status==="done" && analysis && (
        <div>
          <SectionBlock num="01" title="Executive Summary" accentColor={C.green}>
            {analysis.executive_summary.split(/\n/).map((p,i) => p.trim() && <p key={i} style={{ marginBottom:8 }}>{p}</p>)}
          </SectionBlock>

          <SectionBlock num="02" title="Key Business Drivers" accentColor={C.blue}>
            {analysis.key_drivers.map((d,i) => (
              <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom: i < analysis.key_drivers.length-1 ? "1px solid #22283a":"none" }}>
                <div style={{ marginBottom:6 }}>
                  <strong style={{ color:"#e8eaf0" }}>{d.indicador}</strong>{" "}
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color: d.variacao.startsWith("+") || d.variacao.includes("▲") ? C.green : C.orange }}>{d.variacao}</span>
                </div>
                <ul style={{ listStyle:"none", padding:0 }}>
                  {d.drivers.map((dr,j) => <li key={j} style={{ padding:"3px 0 3px 14px", position:"relative", color:"#9ca3af" }}><span style={{ position:"absolute", left:0, color:C.green, fontWeight:700 }}>›</span>{dr}</li>)}
                </ul>
              </div>
            ))}
          </SectionBlock>

          <SectionBlock num="03" title="Structural Trends" accentColor="#c084fc">
            {analysis.structural_trends.map((t,i) => (
              <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom: i < analysis.structural_trends.length-1 ? "1px solid #22283a":"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                  <strong style={{ color:"#e8eaf0" }}>{t.indicador}</strong>
                  <TrendBadge tipo={t.tipo} />
                </div>
                <p style={{ color:"#9ca3af" }}>{t.analise}</p>
              </div>
            ))}
          </SectionBlock>

          <SectionBlock num="04" title="Key Risks & Anomalies" accentColor={C.orange}>
            {analysis.risks_anomalies.map((r,i) => (
              <div key={i} style={{ marginBottom:12, padding:"12px 14px", background:"rgba(255,107,74,0.05)", border:"1px solid rgba(255,107,74,0.12)", borderRadius:8 }}>
                <div style={{ color:C.orange, fontWeight:600, fontSize:13, marginBottom:4 }}>⚠ {r.risco}</div>
                <div style={{ color:"#9ca3af", fontSize:12, fontFamily:"'DM Mono',monospace" }}>{r.driver}</div>
              </div>
            ))}
          </SectionBlock>

          <SectionBlock num="05" title="Root Cause Analysis" accentColor={C.yellow}>
            {analysis.root_cause.map((rc,i) => (
              <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom: i < analysis.root_cause.length-1 ? "1px solid #22283a":"none" }}>
                <strong style={{ color:"#e8eaf0" }}>{rc.movimento}</strong>
                <p style={{ margin:"6px 0 8px", color:"#9ca3af" }}>{rc.causa}</p>
                <ul style={{ listStyle:"none", padding:0 }}>
                  {rc.breakdown.map((b,j) => <li key={j} style={{ padding:"3px 0 3px 14px", position:"relative", color:"#9ca3af" }}><span style={{ position:"absolute", left:0, color:C.yellow, fontWeight:700 }}>›</span>{b}</li>)}
                </ul>
              </div>
            ))}
          </SectionBlock>

          <SectionBlock num="06" title="Recommended Actions" accentColor={C.green}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:12 }}>
              {analysis.actions.map((a,i) => (
                <div key={i} style={{ background:"rgba(0,229,160,0.05)", border:"1px solid rgba(0,229,160,0.12)", borderRadius:8, padding:14 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.green, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{a.area}</div>
                  <div style={{ fontSize:13 }}>{a.acao}</div>
                </div>
              ))}
            </div>
          </SectionBlock>

          <SectionBlock num="07" title="Questions for Leadership" accentColor={C.blue}>
            <ul style={{ listStyle:"none", padding:0 }}>
              {analysis.questions.map((q,i) => (
                <li key={i} style={{ padding:"6px 0 6px 16px", position:"relative", borderBottom: i < analysis.questions.length-1 ? "1px solid #1a1f2e":"none", color:"#c5c9d6" }}>
                  <span style={{ position:"absolute", left:0, color:C.blue, fontWeight:700 }}>?</span>{q}
                </li>
              ))}
            </ul>
          </SectionBlock>
        </div>
      )}
    </div>
  );
}

export default function KpiCard({ label, value, pill, pillUp, sub, color }) {
  const accent = color === "green" ? "#00e5a0" : color === "blue" ? "#4f7cff" : color === "yellow" ? "#ffd166" : "#ff6b4a";
  return (
    <div style={{ background:"#111318", border:"1px solid #22283a", borderRadius:12, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:accent }} />
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-1px", marginBottom:6 }}>{value}</div>
      {pill && <span style={{ background: pillUp ? "rgba(0,229,160,0.15)" : "rgba(255,107,74,0.15)", color: pillUp ? "#00e5a0" : "#ff6b4a", fontFamily:"'DM Mono',monospace", fontSize:11, padding:"2px 8px", borderRadius:100 }}>{pill}</span>}
      {sub && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

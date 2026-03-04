export default function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
      {children}
      <div style={{ flex:1, height:1, background:"#22283a" }} />
    </div>
  );
}

export default function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ background:"#111318", border:"1px solid #22283a", borderRadius:12, padding:22, ...style }}>
      {title && <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{title}</div>}
      {subtitle && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7280", marginBottom:18 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

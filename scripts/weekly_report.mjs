import https from "https";
import nodemailer from "nodemailer";
import { GoogleAuth } from "google-auth-library";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const SHEET_ID = "1-iFLORoVt9ocMaGa5tLLD7NgoU_3d3TV7KOlNUoRUuw";
const SHEET_NAME = "Semanal";
const GA4_PROPERTY = "376951228";
const RECIPIENTS = ["robson.privado@madeiramadeira.com.br","fernando.belleza@madeiramadeira.com.br","alexandre.pereira@iguanafix.com.br","bianca.pessoa@madeiramadeira.com.br","lucas.navarro@madeiramadeira.com.br"];

function post(h,p,hd,b){return new Promise((res,rej)=>{const d=JSON.stringify(b);const r=https.request({hostname:h,path:p,method:"POST",headers:{...hd,"Content-Length":Buffer.byteLength(d)}},(rs)=>{let raw="";rs.on("data",c=>raw+=c);rs.on("end",()=>{try{res(JSON.parse(raw))}catch{res(raw)}})});r.on("error",rej);r.write(d);r.end()})}

async function fetchSheet(){
  console.log("📊 Buscando planilha...");
  const creds=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth=new GoogleAuth({credentials:creds,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
  const token=await auth.getAccessToken();
  const range=encodeURIComponent(SHEET_NAME+"!A1:DZ300");
  const data=await new Promise((res,rej)=>{
    https.get(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,{headers:{Authorization:`Bearer ${token}`}},(r)=>{
      let raw="";r.on("data",c=>raw+=c);r.on("end",()=>{try{res(JSON.parse(raw))}catch(e){rej(e)}});
    }).on("error",rej);
  });
  if(data.error)throw new Error("Sheets: "+JSON.stringify(data.error));
  const lines=(data.values||[]).map(r=>r.map(v=>(v||"").trim()));
  console.log("✅ Linhas:",lines.length);
  return lines;
}

async function fetchGA4(){
  console.log("📡 Buscando GA4...");
  try{
    const creds=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth=new GoogleAuth({credentials:creds,scopes:["https://www.googleapis.com/auth/analytics.readonly"]});
    const client=new BetaAnalyticsDataClient({auth});
    const [r1]=await client.runReport({
      property:`properties/${GA4_PROPERTY}`,
      dateRanges:[{startDate:"7daysAgo",endDate:"today"}],
      dimensions:[{name:"sessionDefaultChannelGroup"},{name:"deviceCategory"}],
      metrics:[{name:"sessions"},{name:"conversions"},{name:"engagementRate"}]
    });
    const [r2]=await client.runReport({
      property:`properties/${GA4_PROPERTY}`,
      dateRanges:[{startDate:"7daysAgo",endDate:"today"}],
      dimensions:[{name:"pagePath"}],
      metrics:[{name:"sessions"},{name:"conversions"}],
      dimensionFilter:{filter:{fieldName:"pagePath",stringFilter:{matchType:"BEGINS_WITH",value:"/servicos"}}},
      limit:10
    });
    const channels={};
    r1.rows?.forEach(row=>{
      const ch=row.dimensionValues[0].value;
      const dev=row.dimensionValues[1].value;
      const s=parseInt(row.metricValues[0].value||0);
      const c=parseInt(row.metricValues[1].value||0);
      if(!channels[ch])channels[ch]={sessions:0,conversions:0,mobile:0,desktop:0};
      channels[ch].sessions+=s;
      channels[ch].conversions+=c;
      if(dev==="mobile")channels[ch].mobile+=s;
      else channels[ch].desktop+=s;
    });
    const pages=(r2.rows||[]).map(row=>({page:row.dimensionValues[0].value,sessions:parseInt(row.metricValues[0].value||0),conversions:parseInt(row.metricValues[1].value||0)}));
    console.log("✅ GA4: canais",Object.keys(channels).length,"paginas",pages.length);
    return{channels,pages};
  }catch(e){console.warn("⚠️ GA4 erro:",e.message);return null;}
}

function parseData(lines){
  let hi=-1;
  for(let i=0;i<lines.length;i++){if(lines[i].some(c=>/^\d+\/20(25|26)$/.test(c))){hi=i;break;}}
  if(hi===-1)hi=5;
  const headers=lines[hi]||[];
  const wc=[];headers.forEach((h,i)=>{if(/^\d+\/2026$/.test(h))wc.push({col:i,week:h});});
  const rw=wc.filter(({col})=>lines.slice(hi+1).some(r=>r[col]&&r[col]!=="0"&&r[col]!=="")).slice(-9);
  console.log("📅 Semanas:",rw.map(w=>w.week).join(", "));
  const metrics={};
  const targets=["GMV TOTAL","GMV Automático","GMV App","GMV Site","GMV GuideShops","GMV TDV","GMV AVULSO TOTAL","CONVERSÃO GERAL (BUNDLE)","AOV TOTAL"];
  lines.forEach(row=>{
    const name=row[0]?.trim();
    if(!name)return;
    targets.forEach(t=>{
      if(name===t&&!metrics[t]){
        metrics[t]={values:rw.map(({col,week})=>({week,value:row[col]||"0"})),wow:row[row.length-6]||"",vsMeta:row[row.length-4]||""};
        console.log("✅",name,"ultimo:",metrics[t].values[metrics[t].values.length-1]?.value,"WoW:",metrics[t].wow);
      }
    });
  });
  return{metrics,rw};
}

function buildData(metrics,rw,ga4){
  let s=`DADOS PERFORMANCE SERVIÇOS 2026\nSemanas: ${rw.map(w=>w.week).join(", ")}\n\n`;
  Object.entries(metrics).forEach(([name,data])=>{
    s+=`${name}: ${data.values.map(v=>`${v.week}=${v.value}`).join(", ")}`;
    if(data.wow)s+=` | WoW: ${data.wow}`;
    if(data.vsMeta)s+=` | vs Meta: ${data.vsMeta}`;
    s+="\n";
  });
  if(ga4){
    s+="\nGA4 — ÚLTIMOS 7 DIAS:\n";
    Object.entries(ga4.channels).sort((a,b)=>b[1].sessions-a[1].sessions).forEach(([ch,d])=>{
      const conv=d.sessions>0?(d.conversions/d.sessions*100).toFixed(2):0;
      s+=`${ch}: ${d.sessions} sessoes, ${d.conversions} conversoes, taxa ${conv}%, mobile ${d.mobile}, desktop ${d.desktop}\n`;
    });
    if(ga4.pages.length>0){
      s+="\nPaginas /servicos mais visitadas:\n";
      ga4.pages.slice(0,5).forEach(p=>s+=`${p.page}: ${p.sessions} sessoes, ${p.conversions} conversoes\n`);
    }
  }
  s+="\nCONTEXTO: Marketplace servicos para casa. Canais: App/Site (digital), GuideShops (loja fisica), TDV (vendedor dedicado), Avulso (montagem, limpeza, impermeabilizacao).";
  return s;
}

function buildEmail(a,ga4){
  const today=new Date().toLocaleDateString("pt-BR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const sec=(num,title,color,content)=>`<div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:${color}22;padding:12px 18px;border-bottom:1px solid #e5e7eb"><span style="color:${color};font-weight:700;font-family:monospace;font-size:11px;margin-right:8px">${num}</span><span style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">${title}</span></div><div style="padding:16px 18px;font-size:13px;line-height:1.7;color:#374151">${content}</div></div>`;
  const drivers=(a.key_drivers||[]).map(d=>`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6"><strong>${d.indicador}</strong><span style="color:${d.variacao&&d.variacao.startsWith("+")?"#059669":"#dc2626"};font-family:monospace;font-size:12px;margin-left:8px">${d.variacao}</span><ul style="margin:6px 0 0 16px">${(d.drivers||[]).map(dr=>`<li style="color:#6b7280">${dr}</li>`).join("")}</ul></div>`).join("");
  const risks=(a.risks_anomalies||[]).map(r=>`<div style="margin-bottom:10px;padding:12px;background:#fff7ed;border-left:3px solid #f97316;border-radius:0 6px 6px 0"><strong style="color:#c2410c">⚠ ${r.risco}</strong><p style="margin:4px 0 0;color:#6b7280;font-size:12px">${r.driver}</p></div>`).join("");
  const actions=(a.actions||[]).map(ac=>`<div style="margin-bottom:10px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px"><div style="font-size:10px;color:#059669;font-family:monospace;text-transform:uppercase;margin-bottom:4px">${ac.area}</div><div>${ac.acao}</div></div>`).join("");
  const questions=(a.questions||[]).map(q=>`<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;color:#374151"><span style="color:#3b82f6;font-weight:700;margin-right:6px">?</span>${q}</li>`).join("");
  const trends=(a.structural_trends||[]).map(t=>{const badge=t.tipo==="crescimento consistente"?{bg:"#d1fae5",c:"#059669",l:"▲ CRESCIMENTO"}:t.tipo==="queda consistente"?{bg:"#fee2e2",c:"#dc2626",l:"▼ QUEDA"}:{bg:"#fef3c7",c:"#d97706",l:"~ VOLATILIDADE"};return`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6"><span style="background:${badge.bg};color:${badge.c};font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;margin-right:8px">${badge.l}</span><strong>${t.indicador}</strong><p style="margin:6px 0 0;color:#6b7280;font-size:12px">${t.analise}</p></div>`}).join("");
  let ga4Section="";
  if(ga4&&Object.keys(ga4.channels).length>0){
    const rows=Object.entries(ga4.channels).sort((a,b)=>b[1].sessions-a[1].sessions).slice(0,6).map(([ch,d])=>{
      const conv=d.sessions>0?(d.conversions/d.sessions*100).toFixed(2):0;
      return`<tr><td style="padding:8px 12px;color:#374151">${ch}</td><td style="padding:8px 12px;text-align:right;font-family:monospace">${d.sessions.toLocaleString()}</td><td style="padding:8px 12px;text-align:right;font-family:monospace;color:#059669">${d.conversions}</td><td style="padding:8px 12px;text-align:right;font-family:monospace">${conv}%</td></tr>`;
    }).join("");
    let pagesHtml="";
    if(ga4.pages.length>0){
      pagesHtml=`<div style="margin-top:16px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px">Páginas /servicos mais visitadas</div>${ga4.pages.slice(0,5).map(p=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px"><span style="color:#374151">${p.page}</span><span style="font-family:monospace;color:#6b7280">${p.sessions} sessões</span></div>`).join("")}</div>`;
    }
    ga4Section=sec("GA4","Tráfego & Conversão — Últimos 7 dias","#8b5cf6",`<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Canal</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">Sessões</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">Conversões</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">Taxa</th></tr></thead><tbody>${rows}</tbody></table>${pagesHtml}`);
  }
  return`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',system-ui,sans-serif"><div style="max-width:680px;margin:0 auto;padding:24px 16px"><div style="background:linear-gradient(135deg,#0a0c10,#1a1f2e);border-radius:12px;padding:28px 32px;margin-bottom:20px"><div style="font-size:11px;color:#00e5a0;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">✦ ANÁLISE EXECUTIVA AUTOMÁTICA</div><h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px">Report Comercial Serviços</h1><div style="color:#6b7280;font-size:12px;font-family:monospace">${a.semana_referencia} · ${today}</div></div><div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:20px;border:1px solid #e5e7eb;border-left:4px solid #00e5a0"><div style="font-size:11px;font-weight:700;color:#00b37e;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">01 · Executive Summary</div><p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${a.executive_summary}</p></div>${sec("02","Key Business Drivers","#3b82f6",drivers)}${sec("03","Structural Trends","#8b5cf6",trends)}${sec("04","Key Risks","#f97316",risks)}${ga4Section}${sec("06","Recommended Actions","#10b981",actions)}<div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:#eff6ff;padding:12px 18px;border-bottom:1px solid #e5e7eb"><span style="font-weight:700;font-size:13px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em">07 · Questions for Leadership</span></div><div style="padding:16px 18px"><ul style="list-style:none;margin:0;padding:0">${questions}</ul></div></div><div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;font-family:monospace">Gerado automaticamente toda segunda-feira às 10:00 · <a href="https://dashboard-servicos.vercel.app" style="color:#00b37e;text-decoration:none">Ver Dashboard Completo →</a></div></div></body></html>`;
}

async function main(){
  try{
    console.log("🚀 Iniciando...");
    const lines=await fetchSheet();
    const {metrics,rw}=parseData(lines);
    const ga4=await fetchGA4();
    const data=buildData(metrics,rw,ga4);
    const r=await post("api.anthropic.com","/v1/messages",{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},{model:"claude-sonnet-4-20250514",max_tokens:2000,system:'Analista estrategico de marketplace de servicos. Responda SOMENTE JSON sem markdown sem backticks: {"semana_referencia":"string","executive_summary":"string","key_drivers":[{"indicador":"string","variacao":"string","drivers":["string"]}],"structural_trends":[{"indicador":"string","tipo":"crescimento consistente|queda consistente|volatilidade","analise":"string"}],"risks_anomalies":[{"risco":"string","driver":"string"}],"actions":[{"area":"string","acao":"string"}],"questions":["string"]}',messages:[{role:"user",content:data}]});
    const a=JSON.parse(r.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
    console.log("✅ Analise:",a.semana_referencia);
    const tr=nodemailer.createTransport({service:"gmail",auth:{user:GMAIL_USER,pass:GMAIL_PASS}});
    await tr.sendMail({from:`"Dashboard Servicos" <${GMAIL_USER}>`,to:RECIPIENTS.join(","),subject:`📊 Analise Executiva — ${a.semana_referencia}`,html:buildEmail(a,ga4)});
    console.log("✅ Email enviado!");
  }catch(e){console.error("❌",e.message);process.exit(1)}
}
main();

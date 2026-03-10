import https from "https";
import nodemailer from "nodemailer";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const RECIPIENTS = ["robson.privado@madeiramadeira.com.br","fernando.belleza@madeiramadeira.com.br","alexandre.pereira@iguanafix.com.br","bianca.pessoa@madeiramadeira.com.br","lucas.navarro@madeiramadeira.com.br"];
const DATA = "GMV S10=1098k +17,6% WoW. Auto=598k. App=306k. Site=277k. GuideShops=306k. TDV=161k. Avulso=60k -18%. Conv=23,6% recorde. AOV=240.";

function post(h,p,hd,b){return new Promise((res,rej)=>{const d=JSON.stringify(b);const r=https.request({hostname:h,path:p,method:"POST",headers:{...hd,"Content-Length":Buffer.byteLength(d)}},(rs)=>{let raw="";rs.on("data",c=>raw+=c);rs.on("end",()=>{try{res(JSON.parse(raw))}catch{res(raw)}})});r.on("error",rej);r.write(d);r.end()})}

async function main(){
  try{
    console.log("🤖 Gerando analise...");
    const r=await post("api.anthropic.com","/v1/messages",{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},{model:"claude-sonnet-4-20250514",max_tokens:1000,system:'Responda SOMENTE JSON sem markdown: {"semana_referencia":"string","executive_summary":"string","actions":[{"area":"string","acao":"string"}]}',messages:[{role:"user",content:DATA}]});
    const a=JSON.parse(r.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
    console.log("✅ Analise:",a.semana_referencia);
    const tr=nodemailer.createTransport({service:"gmail",auth:{user:GMAIL_USER,pass:GMAIL_PASS}});
    await tr.sendMail({from:`"Dashboard" <${GMAIL_USER}>`,to:RECIPIENTS.join(","),subject:`📊 ${a.semana_referencia}`,html:`<h2>${a.semana_referencia}</h2><p>${a.executive_summary}</p>`});
    console.log("✅ Email enviado!");
  }catch(e){console.error("❌",e.message);process.exit(1)}
}
main();


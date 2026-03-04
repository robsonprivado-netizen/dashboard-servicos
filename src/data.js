export const WEEKS = ["S1","S2","S3","S4","S5","S6","S7","S8","S9"];

export const RAW = {
  gmvTotal:  [550,1037,1003,924,862,922,831,879,925],
  gmvAuto:   [342,595,584,517,488,539,473,520,524],
  gmvApp:    [182,300,307,262,247,282,236,266,257],
  gmvSite:   [155,279,267,242,231,247,228,242,256],
  gmvGS:     [145,276,264,276,267,262,231,232,245],
  gmvTDV:    [57,132,147,131,106,121,125,116,124],
  gmvAvulso: [42,108,92,80,65,75,62,68,68],
  conv:      [19.1,18.4,19.2,19.1,19.4,19.8,20.1,21.4,21.9],
  aov:       [231,278,270,262,257,250,248,249,247],
  aovAuto:   [231,257,257,257,252,236,243,244,233],
  aovGS:     [225,264,257,251,244,259,241,238,233],
  aovTDV:    [284,354,353,314,334,304,284,274,278],
  aovAvulso: [223,359,277,248,249,239,248,267,276],
  sessApp:   [1.60,2.28,2.15,2.00,1.91,1.94,1.82,1.82,1.83],
  sessSite:  [2.63,3.72,3.70,3.23,3.28,3.48,3.17,2.63,2.82],
};

export const WEEKLY = WEEKS.map((w,i) => ({
  week: w,
  "GMV Total": RAW.gmvTotal[i],
  "Automático": RAW.gmvAuto[i],
  "App": RAW.gmvApp[i],
  "Site": RAW.gmvSite[i],
  "GuideShops": RAW.gmvGS[i],
  "TDV": RAW.gmvTDV[i],
  "Avulso": RAW.gmvAvulso[i],
  "Conversão %": RAW.conv[i],
  "AOV": RAW.aov[i],
  "AOV TDV": RAW.aovTDV[i],
  "AOV GS": RAW.aovGS[i],
  "App Sess": RAW.sessApp[i],
  "Site Sess": RAW.sessSite[i],
}));

export const PIE_DATA = [
  { name:"App", value:257 },
  { name:"Site", value:256 },
  { name:"GuideShops", value:245 },
  { name:"TDV", value:124 },
  { name:"Avulso", value:68 },
];

export const COLORS = ["#00e5a0","#4f7cff","#ffd166","#ff6b4a","#c084fc"];
export const C = { green:"#00e5a0", blue:"#4f7cff", yellow:"#ffd166", orange:"#ff6b4a", purple:"#c084fc" };

export const BUSINESS_DATA = `
DADOS DE PERFORMANCE — REPORT COMERCIAL SERVIÇOS 2026 (R$k, semanas S1–S9)

GMV TOTAL: S1=550, S2=1037, S3=1003, S4=924, S5=862, S6=922, S7=831, S8=879, S9=925 | WoW S8→S9: +5,3% | vs Meta: +116%
GMV Automático (App+Site): S1=342, S2=595, S3=584, S4=517, S5=488, S6=539, S7=473, S8=520, S9=524 | WoW: +0,7% | vs Meta: +145,1%
GMV App: S1=182, S2=300, S3=307, S4=262, S5=247, S6=282, S7=236, S8=266, S9=257 | WoW: -3,5%
GMV Site: S1=155, S2=279, S3=267, S4=242, S5=231, S6=247, S7=228, S8=242, S9=256 | WoW: +6,2%
GMV GuideShops: S1=145, S2=276, S3=264, S4=276, S5=267, S6=262, S7=231, S8=232, S9=245 | WoW: +5,7% | vs Meta: +103,5%
GMV TDV: S1=57, S2=132, S3=147, S4=131, S5=106, S6=121, S7=125, S8=116, S9=124 | WoW: +7,2% | vs Meta: +108,6%
GMV Avulso: S1=42, S2=108, S3=92, S4=80, S5=65, S6=75, S7=62, S8=68, S9=68 | WoW: -0,8% | vs Meta: +90%
Conversão Geral %: S1=19.1, S2=18.4, S3=19.2, S4=19.1, S5=19.4, S6=19.8, S7=20.1, S8=21.4, S9=21.9
AOV Total: S1=231, S2=278, S3=270, S4=262, S5=257, S6=250, S7=248, S8=249, S9=247
AOV por canal S9: Automático=233, GuideShops=233, TDV=278, Avulso=276
Sessões App (M): S1=1.60, S2=2.28, S3=2.15, S4=2.00, S5=1.91, S6=1.94, S7=1.82, S8=1.82, S9=1.83
Sessões Site (M): S1=2.63, S2=3.72, S3=3.70, S4=3.23, S5=3.28, S6=3.48, S7=3.17, S8=2.63, S9=2.82
Share GMV S9: Automático=56,7%, GuideShops=26,5%, TDV=13,4%, Avulso=7,4%
`;

export const SYSTEM_PROMPT = `Você é um analista estratégico sênior de um marketplace de serviços para casa.
Produza análise executiva de performance semanal para reunião de liderança.
Use APENAS os dados fornecidos. Não invente números.
Responda SOMENTE com JSON válido, sem markdown, sem backticks, sem texto fora do JSON.

Estrutura obrigatória:
{
  "executive_summary": "resumo em 4-6 frases",
  "key_drivers": [{"indicador":"string","variacao":"string","drivers":["string"]}],
  "structural_trends": [{"indicador":"string","tipo":"crescimento consistente|queda consistente|volatilidade","analise":"string"}],
  "risks_anomalies": [{"risco":"string","driver":"string"}],
  "root_cause": [{"movimento":"string","causa":"string","breakdown":["string"]}],
  "actions": [{"area":"string","acao":"string"}],
  "questions": ["string"]
}`;

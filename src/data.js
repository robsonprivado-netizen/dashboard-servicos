export const WEEKS = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10"];

export const RAW = {
  gmvTotal:  [550,1037,1003,924,862,922,831,879,933,1098],
  gmvAuto:   [342,595,584,517,488,539,473,520,525,598],
  gmvApp:    [182,300,307,262,247,282,236,266,257,306],
  gmvSite:   [155,279,267,242,231,247,228,242,258,277],
  gmvGS:     [145,276,264,276,267,262,231,232,248,306],
  gmvTDV:    [57,132,147,131,106,121,125,116,128,161],
  gmvAvulso: [42,99,79,67,54,65,56,57,73,60],
  conv:      [19.1,18.3,19.0,19.0,19.0,19.3,12.4,16.5,21.7,23.6],
  aov:       [231,280,272,264,262,256,404,324,250,240],
  aovAuto:   [231,259,258,260,255,242,404,318,236,228],
  aovGS:     [225,267,262,252,252,264,396,312,234,229],
  aovTDV:    [284,357,354,315,341,311,412,350,283,264],
  aovAvulso: [223,330,237,207,205,208,227,223,296,236],
  sessApp:   [1.60,2.28,2.15,2.00,1.91,1.94,1.82,1.82,1.83,1.85],
  sessSite:  [2.63,3.72,3.70,3.23,3.28,3.48,3.17,2.63,2.82,3.12],
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
  { name:"App", value:306 },
  { name:"Site", value:277 },
  { name:"GuideShops", value:306 },
  { name:"TDV", value:161 },
  { name:"Avulso", value:60 },
];

export const COLORS = ["#00e5a0","#4f7cff","#ffd166","#ff6b4a","#c084fc"];
export const C = { green:"#00e5a0", blue:"#4f7cff", yellow:"#ffd166", orange:"#ff6b4a", purple:"#c084fc" };

export const BUSINESS_DATA = `
DADOS DE PERFORMANCE — REPORT COMERCIAL SERVIÇOS 2026 (R$k, semanas S1–S10)

GMV TOTAL: S1=550, S2=1037, S3=1003, S4=924, S5=862, S6=922, S7=831, S8=879, S9=933, S10=1098 | WoW S9→S10: +17,6%
GMV Automático: S1=342, S2=595, S3=584, S4=517, S5=488, S6=539, S7=473, S8=520, S9=525, S10=598 | WoW: +13,9%
GMV App: S1=182, S2=300, S3=307, S4=262, S5=247, S6=282, S7=236, S8=266, S9=257, S10=306 | WoW: +19,5%
GMV Site: S1=155, S2=279, S3=267, S4=242, S5=231, S6=247, S7=228, S8=242, S9=258, S10=277 | WoW: +7,3%
GMV GuideShops: S1=145, S2=276, S3=264, S4=276, S5=267, S6=262, S7=231, S8=232, S9=248, S10=306 | WoW: +23,6%
GMV TDV: S1=57, S2=132, S3=147, S4=131, S5=106, S6=121, S7=125, S8=116, S9=128, S10=161 | WoW: +25,8%
GMV Avulso: S1=42, S2=99, S3=79, S4=67, S5=54, S6=65, S7=56, S8=57, S9=73, S10=60 | WoW: -18,0%
Conversão Geral %: S1=19.1, S2=18.3, S3=19.0, S4=19.0, S5=19.0, S6=19.3, S7=12.4, S8=16.5, S9=21.7, S10=23.6
AOV Total: S1=231, S2=280, S3=272, S4=264, S5=262, S6=256, S7=404, S8=324, S9=250, S10=240
AOV por canal S10: Automático=228, GuideShops=229, TDV=264, Avulso=236
Sessões App (M): S1=1.60, S2=2.28, S3=2.15, S4=2.00, S5=1.91, S6=1.94, S7=1.82, S8=1.82, S9=1.83, S10=1.85
Sessões Site (M): S1=2.63, S2=3.72, S3=3.70, S4=3.23, S5=3.28, S6=3.48, S7=3.17, S8=2.63, S9=2.82, S10=3.12
Share GMV S10: App=27,9%, Site=25,2%, GuideShops=27,9%, TDV=14,7%, Avulso=5,5%

DESTAQUES S10: GMV Total atingiu R$1.098k — segundo maior do período (pico S2=R$1.037k superado).
Conversão bateu recorde de 23,6%. GuideShops igualou App em GMV (R$306k cada).
Avulso foi o único canal em queda (-18% WoW).
AOV em queda consistente desde S7 (pico de R$404).
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

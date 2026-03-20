import https from "https";
import { setSessionCookie, ALLOWED_DOMAIN, ALLOWED_EMAILS } from "../_auth.js";

// Verifica o ID token do Google e cria sessão se o domínio for @madeiramadeira.com.br
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "POST") return res.status(405).end();

  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: "No credential provided" });

  try {
    // Verifica o token com a API do Google
    const tokenInfo = await new Promise((resolve, reject) => {
      https.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
        (r) => {
          let raw = "";
          r.on("data", c => (raw += c));
          r.on("end", () => {
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error("Google response parse error")); }
          });
        }
      ).on("error", reject);
    });

    if (tokenInfo.error || !tokenInfo.email) {
      return res.status(401).json({ error: "Token inválido" });
    }

    if (!tokenInfo.email_verified || tokenInfo.email_verified === "false") {
      return res.status(401).json({ error: "E-mail não verificado" });
    }

    if (!tokenInfo.email.endsWith(`@${ALLOWED_DOMAIN}`) && !ALLOWED_EMAILS.includes(tokenInfo.email)) {
      return res.status(403).json({
        error: `Acesso restrito a contas @${ALLOWED_DOMAIN}`
      });
    }

    setSessionCookie(res, tokenInfo.email);
    return res.status(200).json({ ok: true, email: tokenInfo.email });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

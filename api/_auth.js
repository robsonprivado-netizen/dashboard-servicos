import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const COOKIE_NAME = "ds_session";
const ALLOWED_DOMAIN = "madeiramadeira.com.br";
const ALLOWED_EMAILS = ["alexandre.pereira@iguanafix.com.br"];
const MAX_AGE = 7 * 24 * 60 * 60; // 7 dias em segundos

export function makeSessionToken(email) {
  const expiry = Date.now() + MAX_AGE * 1000;
  const payload = `${email}|${expiry}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifySessionToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastPipe = decoded.lastIndexOf("|");
    const payload = decoded.slice(0, lastPipe);
    const sig = decoded.slice(lastPipe + 1);
    const [email, expiry] = payload.split("|");
    if (!email || !expiry) return null;
    if (Date.now() > parseInt(expiry)) return null;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return email;
  } catch {
    return null;
  }
}

export function getSessionEmail(req) {
  const raw = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    raw.split(";")
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const i = c.indexOf("=");
        return [c.slice(0, i), c.slice(i + 1)];
      })
  );
  return verifySessionToken(cookies[COOKIE_NAME] || "");
}

export function setSessionCookie(res, email) {
  const token = makeSessionToken(email);
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export { ALLOWED_DOMAIN, ALLOWED_EMAILS };

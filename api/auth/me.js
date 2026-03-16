import { getSessionEmail } from "../_auth.js";

export default function handler(req, res) {
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, email });
}

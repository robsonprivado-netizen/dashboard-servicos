import { useState, useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | authenticated | unauthenticated
  const [email, setEmail] = useState(null);
  const [error, setError] = useState(null);
  const btnRef = useRef(null);

  // Verifica sessão existente ao montar
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setEmail(d.email);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      })
      .catch(() => setStatus("unauthenticated"));
  }, []);

  // Inicializa o Google Sign-In quando a tela de login aparece
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (!CLIENT_ID) { setError("VITE_GOOGLE_CLIENT_ID não configurado"); return; }

    const initGSI = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        hosted_domain: "madeiramadeira.com.br",
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 280,
        });
      }
    };

    // Se o script já foi carregado, inicializa direto
    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      // Aguarda o script carregar
      const check = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(check); initGSI(); }
      }, 100);
      return () => clearInterval(check);
    }
  }, [status]);

  async function handleCredential(response) {
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao verificar conta");
        return;
      }
      setEmail(data.email);
      setStatus("authenticated");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    setStatus("unauthenticated");
    setEmail(null);
  }

  if (status === "checking") {
    return (
      <div style={{ background: "#0a0c10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid #22283a", borderTopColor: "#00e5a0", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ background: "#0a0c10", color: "#e8eaf0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 380, padding: "0 24px" }}>
          {/* Logo / título */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#00e5a0", letterSpacing: "0.12em", marginBottom: 12 }}>✦ MADEIRAMADEIRA SERVIÇOS</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
              Dashboard <span style={{ color: "#00e5a0" }}>Comercial</span> 2026
            </h1>
            <p style={{ color: "#6b7280", fontFamily: "'DM Mono',monospace", fontSize: 12, margin: 0 }}>
              Acesso restrito a colaboradores MM
            </p>
          </div>

          {/* Card de login */}
          <div style={{ background: "#111318", border: "1px solid #22283a", borderRadius: 16, padding: "32px 28px" }}>
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Faça login com sua conta <strong style={{ color: "#e8eaf0" }}>@madeiramadeira.com.br</strong> para acessar.
            </p>

            {/* Botão do Google renderizado pela GSI */}
            <div ref={btnRef} style={{ display: "flex", justifyContent: "center", marginBottom: error ? 16 : 0 }} />

            {error && (
              <div style={{ background: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.25)", borderRadius: 8, padding: "10px 14px", color: "#ff6b4a", fontFamily: "'DM Mono',monospace", fontSize: 12, marginTop: 16 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          <p style={{ color: "#374151", fontSize: 11, fontFamily: "'DM Mono',monospace", marginTop: 20 }}>
            Apenas contas @madeiramadeira.com.br têm acesso
          </p>
        </div>
      </div>
    );
  }

  // Autenticado — renderiza o app com header de usuário
  return (
    <>
      {children}
      {/* Badge de usuário logado no canto */}
      <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", alignItems: "center", gap: 10, background: "#111318", border: "1px solid #22283a", borderRadius: 8, padding: "8px 14px", zIndex: 1000 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00e5a0" }} />
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#6b7280" }}>{email}</span>
        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "0 0 0 8px", borderLeft: "1px solid #22283a" }}
        >
          Sair
        </button>
      </div>
    </>
  );
}

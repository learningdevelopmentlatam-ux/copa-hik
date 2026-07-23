import { useState } from "react";
import Login from "./components/Login";
import AdminPanel from "./components/AdminPanel";
import GrupoView from "./components/GrupoView";
import EvaluadorView from "./components/EvaluadorView";
import PodioView from "./components/PodioView";

const FONT = "'Segoe UI', sans-serif";

const globalStyles = `
  *:focus-visible {
    outline: 2px solid #C00000 !important;
    outline-offset: 2px;
  }
  @media (max-width: 480px) {
    html { font-size: 15px; }
  }
`;

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("copa_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem("copa_session", JSON.stringify(userData));
    setSession(userData);
  };

  const logout = () => {
    localStorage.removeItem("copa_session");
    setSession(null);
  };

  if (!session) {
    return <><style>{globalStyles}</style><Login onLogin={login} /></>;
  }

  if (session.tipo === "grupo") {
    return (
      <PlaceholderShell session={session} onLogout={logout} rolLabel="Grupo Competidor" rolColor="#2196F3" icon="👥">
        {(view) => view === "podio" ? <PodioView /> : <GrupoView session={session} />}
      </PlaceholderShell>
    );
  }

  if (session.tipo === "evaluador") {
    const rolLabel = session.esAdmin ? "Admin / Evaluador" : "Evaluador";
    return (
      <PlaceholderShell session={session} onLogout={logout} rolLabel={rolLabel} rolColor="#FF9800" icon="📋">
        {(view) =>
          view === "podio" ? <PodioView /> :
          view === "admin" ? <AdminPanel session={session} /> :
          <EvaluadorView session={session} />
        }
      </PlaceholderShell>
    );
  }

  return null;
}

// ── Shell compartido para las vistas ────────────────────────────────────────

function PlaceholderShell({ session, onLogout, rolLabel, rolColor, children }) {
  const [view, setView] = useState("main");

  const mainLabel = session.tipo === "evaluador" ? "Evaluar" : "Tareas";

  return (
    <div style={{
      fontFamily: FONT, minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a1a 100%)",
      padding: "16px",
    }}>
      <style>{globalStyles}</style>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderRadius: 14, marginBottom: 16,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 800, color: "#fff",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {session.nombre}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: rolColor,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {rolLabel}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            style={{
              padding: "10px 16px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "#999",
              fontSize: 12, cursor: "pointer", flexShrink: 0,
            }}
          >
            Salir
          </button>
        </div>

        {/* Copa HIK mini header */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{
            fontSize: 11, letterSpacing: 3, color: "#C00000",
            fontWeight: 700, textTransform: "uppercase",
          }}>
            🏆 Copa HIK · Torneo de Instaladores
          </span>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 16,
          padding: 4, borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }} role="tablist">
          <button
            onClick={() => setView("main")}
            role="tab"
            aria-selected={view === "main"}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 8,
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", minHeight: 44,
              background: view === "main" ? rolColor : "transparent",
              color: view === "main" ? (session.tipo === "evaluador" ? "#000" : "#fff") : "#888",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {mainLabel}
          </button>
          {session.esAdmin && (
            <button
              onClick={() => setView("admin")}
              role="tab"
              aria-selected={view === "admin"}
              style={{
                flex: 1, padding: "12px 12px", borderRadius: 8,
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: "pointer", minHeight: 44,
                background: view === "admin" ? "#C00000" : "transparent",
                color: view === "admin" ? "#fff" : "#888",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setView("podio")}
            role="tab"
            aria-selected={view === "podio"}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 8,
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", minHeight: 44,
              background: view === "podio" ? "#FFD700" : "transparent",
              color: view === "podio" ? "#000" : "#888",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            🏆 Podio
          </button>
        </div>

        {children(view)}

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 32,
          fontSize: 10, color: "rgba(255,255,255,0.25)",
        }}>
          Copa HIK 2026 · Hikvision
        </div>
      </div>
    </div>
  );
}

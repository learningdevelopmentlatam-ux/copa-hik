import { useState, useEffect } from "react";
import {
  fetchGruposLista,
  fetchEvaluadoresLista,
  loginGrupo,
  loginEvaluador,
} from "../supabaseHelpers";

const FONT = "'Segoe UI', sans-serif";

export default function Login({ onLogin }) {
  const [paso, setPaso] = useState("rol");
  const [grupos, setGrupos] = useState([]);
  const [evaluadores, setEvaluadores] = useState([]);
  const [selId, setSelId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGruposLista().then(setGrupos);
    fetchEvaluadoresLista().then(setEvaluadores);
  }, []);

  const reset = () => {
    setPaso("rol");
    setSelId("");
    setPassword("");
    setError("");
  };

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError("");

    let session = null;

    if (paso === "grupo") {
      if (!selId) { setError("Selecciona tu grupo"); setLoading(false); return; }
      session = await loginGrupo(Number(selId), password);
    } else if (paso === "evaluador") {
      if (!selId) { setError("Selecciona tu nombre"); setLoading(false); return; }
      session = await loginEvaluador(Number(selId), password);
    }

    setLoading(false);

    if (session) {
      onLogin(session);
    } else {
      setError("Credenciales incorrectas");
    }
  };

  const roles = [
    { id: "grupo", label: "Soy un Grupo", icon: "👥", desc: "Ingresa como equipo competidor" },
    { id: "evaluador", label: "Soy Evaluador", icon: "📋", desc: "Evalua y califica a los grupos" },
  ];

  return (
    <div style={{
      fontFamily: FONT, minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a1a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
          <h1 style={{
            fontSize: 32, fontWeight: 900, margin: "0 0 4px",
            color: "#fff", letterSpacing: 2,
          }}>
            COPA HIK
          </h1>
          <div style={{
            fontSize: 12, letterSpacing: 3, color: "#C00000",
            fontWeight: 700, textTransform: "uppercase",
          }}>
            Torneo de Instaladores
          </div>
        </div>

        {/* Selector de rol */}
        {paso === "rol" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setPaso(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 20px", borderRadius: 14,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              >
                <div style={{
                  fontSize: 28, width: 50, height: 50, borderRadius: 12,
                  background: "rgba(192,0,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Formulario de login */}
        {paso !== "rol" && (
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 24,
            position: "relative",
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#fff",
              marginBottom: 16, textAlign: "center",
            }}>
              {paso === "grupo" && "Ingreso de Grupo"}
              {paso === "evaluador" && "Ingreso de Evaluador"}
            </div>

            {/* Dropdown para grupo o evaluador */}
            {(paso === "grupo" || paso === "evaluador") && (
              <>
                <label htmlFor="copa-select" style={{
                  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
                  overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
                }}>
                  {paso === "grupo" ? "Selecciona tu grupo" : "Selecciona tu nombre"}
                </label>
                <select
                  id="copa-select"
                  value={selId}
                  onChange={(e) => { setSelId(e.target.value); setError(""); }}
                  style={{
                    display: "block", width: "100%", padding: "12px 14px",
                    borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                    fontSize: 14, background: "rgba(255,255,255,0.08)",
                    color: selId ? "#fff" : "#888",
                    boxSizing: "border-box",
                    marginBottom: 10, cursor: "pointer",
                    appearance: "auto", minHeight: 44,
                  }}
                >
                  <option value="" style={{ background: "#2a2a2a", color: "#888" }}>
                    {paso === "grupo" ? "-- Selecciona tu grupo --" : "-- Selecciona tu nombre --"}
                  </option>
                  {(paso === "grupo" ? grupos : evaluadores).map((item) => (
                    <option key={item.id} value={item.id} style={{ background: "#2a2a2a", color: "#fff" }}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Password */}
            <label htmlFor="copa-password" style={{
              position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
              overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
            }}>
              Contraseña
            </label>
            <input
              id="copa-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Contraseña"
              type="password"
              autoComplete="current-password"
              style={{
                display: "block", width: "100%", padding: "12px 14px",
                borderRadius: 10, border: `1px solid ${error ? "#e74c3c" : "rgba(255,255,255,0.15)"}`,
                fontSize: 14, background: "rgba(255,255,255,0.08)",
                color: "#fff", boxSizing: "border-box",
                marginBottom: 10, minHeight: 44,
              }}
            />

            {error && (
              <div style={{
                fontSize: 12, color: "#e74c3c", textAlign: "center",
                marginBottom: 10, fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 10,
                border: "none", background: "#C00000", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                opacity: loading ? 0.7 : 1,
                marginBottom: 8, minHeight: 48,
              }}
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>

            <button
              onClick={reset}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent", color: "#999",
                fontSize: 12, cursor: "pointer", minHeight: 44,
              }}
            >
              Volver
            </button>
          </div>
        )}

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

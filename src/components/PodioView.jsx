import { useState, useEffect, useCallback } from "react";
import {
  fetchFases,
  fetchGruposLista,
  fetchTodasCalificaciones,
  fetchTodasTareas,
} from "../supabaseHelpers";

const MEDAL = [
  { emoji: "🥇", bg: "linear-gradient(135deg, #FFD700 0%, #FFA000 100%)", border: "#FFD700", color: "#000", label: "1er Lugar" },
  { emoji: "🥈", bg: "linear-gradient(135deg, #C0C0C0 0%, #9E9E9E 100%)", border: "#C0C0C0", color: "#000", label: "2do Lugar" },
  { emoji: "🥉", bg: "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)", border: "#CD7F32", color: "#000", label: "3er Lugar" },
];

export default function PodioView() {
  const [fases, setFases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [califs, setCalifs] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [expandedGrupo, setExpandedGrupo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [f, g, c, t] = await Promise.all([
      fetchFases(),
      fetchGruposLista(),
      fetchTodasCalificaciones(),
      fetchTodasTareas(),
    ]);
    setFases(f);
    setGrupos(g);
    setCalifs(c);
    setTareas(t);
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const id = setInterval(reload, 8000);
    return () => clearInterval(id);
  }, [reload]);

  const fasesCerradas = fases.filter((f) => f.bloqueada);

  function maxPuntajeFase(faseId) {
    return tareas
      .filter((t) => t.fase_id === faseId)
      .reduce((s, t) => s + t.puntos_max, 0);
  }

  function puntajeFase(grupoId, faseId) {
    return califs
      .filter((c) => c.grupo_id === grupoId && c.fase_id === faseId)
      .reduce((s, c) => s + c.puntos, 0);
  }

  function evaluadorFase(grupoId, faseId) {
    const c = califs.find((c) => c.grupo_id === grupoId && c.fase_id === faseId && c.evaluador_nombre);
    return c?.evaluador_nombre || null;
  }

  function calcRanking() {
    return grupos.map((g) => {
      const faseScores = fasesCerradas.map((f) => ({
        faseId: f.id,
        nombre: f.nombre,
        orden: f.orden,
        puntos: puntajeFase(g.id, f.id),
        max: maxPuntajeFase(f.id),
        evaluador: evaluadorFase(g.id, f.id),
      }));

      const total = faseScores.reduce((s, fs) => s + fs.puntos, 0);
      const promedio = fasesCerradas.length > 0
        ? total / fasesCerradas.length
        : 0;

      return {
        grupoId: g.id,
        nombre: g.nombre,
        faseScores,
        total,
        promedio,
      };
    }).sort((a, b) => b.promedio - a.promedio || b.total - a.total);
  }

  const ranking = calcRanking();
  const hayDatos = fasesCerradas.length > 0;

  if (!loaded) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏆</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>Cargando resultados...</div>
        <div style={{
          marginTop: 16, width: 40, height: 4, borderRadius: 2,
          background: "#FFD700", margin: "16px auto 0",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  if (!hayDatos) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          Podio en espera
        </div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
          Los resultados aparecerán cuando se cierre la primera fase.
          <br />Esta pantalla se actualiza automáticamente.
        </div>
        <div style={{
          marginTop: 24, width: 40, height: 4, borderRadius: 2,
          background: "#C00000", margin: "24px auto 0",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  const top3 = ranking.slice(0, 3);

  return (
    <div>
      {/* Podio visual — top 3 */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2,
        textTransform: "uppercase", marginBottom: 14,
      }}>
        PODIO
      </div>

      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: 6, marginBottom: 24, minHeight: 180,
        padding: "0 4px",
      }}>
        {[1, 0, 2].map((idx) => {
          const item = top3[idx];
          if (!item) return null;
          const medal = MEDAL[idx];
          const heights = [160, 130, 110];
          const h = heights[idx];

          return (
            <div key={item.grupoId} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              flex: idx === 0 ? "1.2 1 0%" : "1 1 0%",
              maxWidth: idx === 0 ? 130 : 110,
              minWidth: 0,
            }}>
              <div style={{ fontSize: idx === 0 ? 32 : 26, marginBottom: 4 }}>
                {medal.emoji}
              </div>
              <div style={{
                fontSize: idx === 0 ? 12 : 11, fontWeight: 800, color: "#fff",
                textAlign: "center", marginBottom: 4, lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis",
                width: "100%", whiteSpace: "nowrap",
              }}>
                {item.nombre}
              </div>
              <div style={{
                fontSize: idx === 0 ? 18 : 15, fontWeight: 800,
                color: medal.border, marginBottom: 4,
              }}>
                {item.promedio.toFixed(1)}
              </div>
              <div style={{
                width: "100%", height: h, borderRadius: "12px 12px 0 0",
                background: medal.bg, border: `2px solid ${medal.border}`,
                borderBottom: "none",
                display: "flex", alignItems: "flex-start", justifyContent: "center",
                paddingTop: 14,
              }}>
                <div style={{
                  fontSize: idx === 0 ? 28 : 22, fontWeight: 900, color: medal.color,
                  opacity: 0.6,
                }}>
                  {idx + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de ranking completa */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2,
        textTransform: "uppercase", marginBottom: 10,
      }}>
        RANKING GENERAL · {fasesCerradas.length} fase{fasesCerradas.length !== 1 ? "s" : ""} cerrada{fasesCerradas.length !== 1 ? "s" : ""}
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 16 }}>
        <table style={{
          width: "100%", minWidth: 400, borderCollapse: "separate",
          borderSpacing: 0, fontSize: 12,
        }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Grupo</th>
              {fasesCerradas
                .sort((a, b) => a.orden - b.orden)
                .map((f) => (
                  <th key={f.id} style={thStyle}>
                    <span style={{ display: "block", fontSize: 10, lineHeight: 1.2 }}>{f.nombre}</span>
                    <span style={{ display: "block", fontSize: 9, color: "#666", marginTop: 1 }}>/{maxPuntajeFase(f.id)}</span>
                  </th>
                ))}
              <th style={thStyle}>Prom.</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item, i) => {
              const isMedal = i < 3;
              const medal = isMedal ? MEDAL[i] : null;
              const isExpanded = expandedGrupo === item.grupoId;

              return [
                <tr
                  key={item.grupoId}
                  onClick={() => setExpandedGrupo(isExpanded ? null : item.grupoId)}
                  style={{
                    cursor: "pointer",
                    background: isMedal
                      ? `${medal.border}11`
                      : i % 2 === 0
                        ? "rgba(255,255,255,0.03)"
                        : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{
                    ...tdStyle,
                    fontWeight: 800,
                    color: isMedal ? medal.border : "#888",
                    fontSize: isMedal ? 14 : 12,
                  }}>
                    {isMedal ? medal.emoji : i + 1}
                  </td>
                  <td style={{
                    ...tdStyle, textAlign: "left",
                    fontWeight: isMedal ? 800 : 600,
                    color: isMedal ? "#fff" : "#ccc",
                  }}>
                    {item.nombre}
                  </td>
                  {fasesCerradas
                    .sort((a, b) => a.orden - b.orden)
                    .map((f) => {
                      const fs = item.faseScores.find((s) => s.faseId === f.id);
                      const pts = fs ? fs.puntos : 0;
                      const max = fs ? fs.max : maxPuntajeFase(f.id);
                      const pct = max > 0 ? pts / max : 0;
                      return (
                        <td key={f.id} style={{
                          ...tdStyle,
                          color: pct >= 0.8 ? "#4CAF50" : pct >= 0.5 ? "#FF9800" : "#ff4444",
                          fontWeight: 700,
                        }}>
                          {pts.toFixed(1)}
                        </td>
                      );
                    })}
                  <td style={{
                    ...tdStyle,
                    fontWeight: 800,
                    fontSize: 14,
                    color: isMedal ? medal.border : "#fff",
                  }}>
                    {item.promedio.toFixed(1)}
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${item.grupoId}-detail`}>
                    <td colSpan={2 + fasesCerradas.length + 1} style={{
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#666",
                        letterSpacing: 1, textTransform: "uppercase", marginBottom: 6,
                      }}>
                        DETALLE — {item.nombre}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {item.faseScores.map((fs) => (
                          <div key={fs.faseId} style={{
                            padding: "8px 12px", borderRadius: 8, flex: "1 1 120px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#ccc", marginBottom: 4 }}>
                              {fs.nombre}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                              {fs.puntos.toFixed(1)}<span style={{ fontSize: 11, color: "#888" }}>/{fs.max}</span>
                            </div>
                            {fs.evaluador && (
                              <div style={{ fontSize: 10, color: "#FF9800", marginTop: 4 }}>
                                Evaluado por: {fs.evaluador}
                              </div>
                            )}
                            {!fs.evaluador && (
                              <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                                Sin calificación
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                        Total acumulado: <span style={{ fontWeight: 700, color: "#fff" }}>{item.total.toFixed(1)}</span>
                        {" · "}Promedio: <span style={{ fontWeight: 700, color: "#fff" }}>{item.promedio.toFixed(1)}</span>
                        {" · "}Fases: {fasesCerradas.length}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
        fontSize: 10, color: "#666", marginBottom: 8,
      }}>
        <span><span style={{ color: "#4CAF50" }}>●</span> ≥80%</span>
        <span><span style={{ color: "#FF9800" }}>●</span> 50-79%</span>
        <span><span style={{ color: "#ff4444" }}>●</span> &lt;50%</span>
        <span style={{ color: "#555" }}>Toca una fila para ver detalle</span>
      </div>

      {/* Fases aún no cerradas */}
      {fases.filter((f) => !f.bloqueada).length > 0 && (
        <div style={{
          textAlign: "center", padding: "12px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11, color: "#888",
        }}>
          Fases pendientes: {fases.filter((f) => !f.bloqueada).map((f) => f.nombre).join(", ")}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "8px 6px",
  textAlign: "center",
  fontWeight: 700,
  color: "#888",
  borderBottom: "2px solid rgba(255,255,255,0.1)",
  whiteSpace: "nowrap",
  fontSize: 11,
};

const tdStyle = {
  padding: "12px 6px",
  textAlign: "center",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  whiteSpace: "nowrap",
};

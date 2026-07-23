import { useState, useEffect, useCallback } from "react";
import {
  fetchFases,
  fetchTareas,
  fetchTodasTareas,
  fetchProgresoGrupo,
  saveProgresoGrupo,
  fetchCalificacionesFase,
  getTimerGrupo,
  stopTimerGrupo,
} from "../supabaseHelpers";

export default function GrupoView({ session }) {
  const [fases, setFases] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [resultados, setResultados] = useState({});
  const [todasTareas, setTodasTareas] = useState([]);
  const [miTimer, setMiTimer] = useState(null);

  const faseActiva = fases.find((f) => f.activa);
  const fasesCerradas = fases.filter((f) => f.bloqueada);

  const reload = useCallback(async () => {
    const f = await fetchFases();
    setFases(f);
    const activa = f.find((x) => x.activa);
    if (activa) {
      const [t, p, tg] = await Promise.all([
        fetchTareas(activa.id),
        fetchProgresoGrupo(session.grupo_id),
        getTimerGrupo(session.grupo_id, activa.id),
      ]);
      setTareas(t);
      setMiTimer(tg);
      const map = {};
      p.forEach((r) => { map[r.tarea_id] = r.completado; });
      setProgreso(map);
    } else {
      setTareas([]);
      setProgreso({});
      setMiTimer(null);
    }
    const allTareas = await fetchTodasTareas();
    setTodasTareas(allTareas);
    const cerradas = f.filter((x) => x.bloqueada);
    const resMap = {};
    for (const fase of cerradas) {
      const cals = await fetchCalificacionesFase(session.grupo_id, fase.id);
      resMap[fase.id] = cals;
    }
    setResultados(resMap);
    setLoaded(true);
  }, [session.grupo_id]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function toggleTarea(tareaId) {
    const nuevo = !progreso[tareaId];
    setSaving(tareaId);
    setProgreso((p) => ({ ...p, [tareaId]: nuevo }));
    await saveProgresoGrupo(session.grupo_id, tareaId, nuevo);
    setSaving(null);
  }

  async function handleTerminamos() {
    if (!faseActiva) return;
    await stopTimerGrupo(session.grupo_id, faseActiva.id);
    await reload();
  }

  function timerInfo() {
    if (!faseActiva) return null;
    if (!miTimer || !miTimer.timer_inicio) {
      const m = faseActiva.timer_minutos || 0;
      return {
        text: `${String(m).padStart(2, "0")}:00`,
        status: "waiting",
        pct: 100,
      };
    }
    if (miTimer.detenido) {
      return { text: "Tiempo detenido", status: "stopped", pct: 0 };
    }
    const total = faseActiva.timer_minutos * 60 * 1000;
    const elapsed = now - new Date(miTimer.timer_inicio).getTime();
    const rem = total - elapsed;
    if (rem <= 0) return { text: "Tiempo agotado", status: "expired", pct: 0 };
    const m = Math.floor(rem / 60000);
    const sec = Math.floor((rem % 60000) / 1000);
    return {
      text: `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
      status: "running",
      pct: Math.round((rem / total) * 100),
    };
  }

  const timer = timerInfo();
  const completadas = tareas.filter((t) => progreso[t.id]).length;
  const readOnly = !faseActiva || faseActiva.bloqueada || !timer || timer.status !== "running";

  if (!loaded) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>👥</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>Cargando...</div>
        <div style={{
          marginTop: 16, width: 40, height: 4, borderRadius: 2,
          background: "#C00000", margin: "16px auto 0",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  if (!faseActiva) {
    return (
      <div>
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Esperando a que se active una fase
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
            El administrador activará la siguiente fase cuando sea el momento.
            Esta pantalla se actualizará automáticamente.
          </div>
          <div style={{
            marginTop: 24, width: 40, height: 4, borderRadius: 2,
            background: "#C00000", margin: "24px auto 0",
            animation: "pulse 2s ease-in-out infinite",
          }} />
          <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
        </div>

        <ResultadosAnteriores fasesCerradas={fasesCerradas} resultados={resultados} todasTareas={todasTareas} />
      </div>
    );
  }

  return (
    <div>
      {/* Fase activa header */}
      <div style={{
        padding: "16px 18px", borderRadius: 14, marginBottom: 16,
        background: "rgba(192,0,0,0.1)",
        border: "1px solid rgba(192,0,0,0.25)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#C00000", letterSpacing: 2, textTransform: "uppercase" }}>
              FASE ACTIVA
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 4 }}>
              {faseActiva.nombre}
            </div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 8,
            background: "#C00000", fontSize: 10, fontWeight: 700, color: "#fff",
          }}>
            Fase {faseActiva.orden}
          </div>
        </div>

        {/* Timer */}
        {timer && (
          <div>
            <div style={{
              fontSize: timer.status === "expired" ? 20 : 32,
              fontWeight: 800, fontFamily: timer.status === "expired" ? "'Segoe UI', sans-serif" : "monospace",
              color: timer.status === "expired" ? "#ff4444" : timer.status === "waiting" ? "#888" : "#fff",
              textAlign: "center", marginBottom: 8,
            }}>
              {timer.status === "waiting" && (
                <span style={{ fontSize: 11, display: "block", color: "#888", fontFamily: "'Segoe UI', sans-serif", fontWeight: 600, marginBottom: 4 }}>
                  Timer configurado
                </span>
              )}
              {timer.text}
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: "rgba(255,255,255,0.08)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${timer.pct}%`,
                background: timer.status === "expired" || timer.status === "stopped"
                  ? "#ff4444"
                  : timer.pct < 20
                    ? "#ff8800"
                    : "#C00000",
                transition: "width 1s linear",
              }} />
            </div>
            {timer.status === "running" && (
              <button
                onClick={handleTerminamos}
                style={{
                  marginTop: 10, width: "100%", padding: "12px",
                  borderRadius: 10, border: "none",
                  background: "rgba(255,255,255,0.1)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  minHeight: 44,
                }}
              >
                Terminamos
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progreso */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
          AUTOEVALUACIÓN
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: completadas === tareas.length && tareas.length > 0 ? "#4CAF50" : "#888" }}>
          {completadas}/{tareas.length}
        </div>
      </div>

      <div style={{
        fontSize: 11, color: "#666", marginBottom: 14,
        padding: "8px 12px", borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        Marca las tareas que tu equipo ha completado. Esto es solo de referencia — la calificación oficial la realiza el evaluador.
      </div>

      {/* Tareas checklist */}
      {tareas.map((t) => {
        const checked = !!progreso[t.id];
        const isSaving = saving === t.id;

        return (
          <div
            key={t.id}
            onClick={() => !readOnly && !isSaving && toggleTarea(t.id)}
            style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              padding: "14px 16px", borderRadius: 12, marginBottom: 8,
              background: checked ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${checked ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.08)"}`,
              cursor: readOnly ? "default" : "pointer",
              opacity: isSaving ? 0.7 : 1,
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
              background: checked ? "#4CAF50" : "rgba(255,255,255,0.08)",
              border: `2px solid ${checked ? "#4CAF50" : "rgba(255,255,255,0.2)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fff",
              transition: "background 0.2s, border-color 0.2s",
            }}>
              {checked && "✓"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: checked ? "rgba(255,255,255,0.6)" : "#fff",
                textDecoration: checked ? "line-through" : "none",
                transition: "color 0.2s",
              }}>
                {t.orden}. {t.titulo}
              </div>
              <div style={{
                fontSize: 12, color: "#999", marginTop: 6, lineHeight: 1.5,
              }}>
                {t.descripcion}
              </div>
              <div style={{
                fontSize: 11, color: "#C00000", fontWeight: 700, marginTop: 6,
              }}>
                {t.puntos_max} pts
              </div>
            </div>
          </div>
        );
      })}

      {tareas.length === 0 && (
        <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: 20 }}>
          Sin tareas para esta fase
        </div>
      )}

      <ResultadosAnteriores fasesCerradas={fasesCerradas} resultados={resultados} todasTareas={todasTareas} />
    </div>
  );
}

function ResultadosAnteriores({ fasesCerradas, resultados, todasTareas }) {
  if (fasesCerradas.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#888",
        letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
      }}>
        RESULTADOS ANTERIORES
      </div>

      {fasesCerradas.map((fase) => {
        const cals = resultados[fase.id] || [];
        const tareasDeEstaFase = todasTareas.filter((t) => t.fase_id === fase.id);
        const total = cals.reduce((s, c) => s + Number(c.puntos || 0), 0);
        const maxTotal = tareasDeEstaFase.reduce((s, t) => s + Number(t.puntos_max || 0), 0);
        const evaluador = cals.length > 0 ? cals[0].evaluador_nombre : null;

        return (
          <div key={fase.id} style={{
            padding: "14px 16px", borderRadius: 12, marginBottom: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: cals.length > 0 ? 12 : 0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  Fase {fase.orden}: {fase.nombre}
                </div>
                {evaluador && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                    Evaluado por: <span style={{ color: "#FF9800", fontWeight: 600 }}>{evaluador}</span>
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: total >= maxTotal * 0.8 ? "#4CAF50" : total >= maxTotal * 0.5 ? "#FF9800" : "#ff4444",
              }}>
                {total}/{maxTotal}
              </div>
            </div>

            {cals.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {tareasDeEstaFase.map((tarea) => {
                  const cal = cals.find((c) => c.tarea_id === tarea.id);
                  return (
                    <div key={tarea.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.03)",
                    }}>
                      <div style={{ fontSize: 12, color: "#ccc", flex: 1, minWidth: 0 }}>
                        {tarea.orden}. {tarea.titulo}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                        color: cal ? "#fff" : "#666",
                      }}>
                        {cal ? `${cal.puntos}/${tarea.puntos_max}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cals.length === 0 && (
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                Aún sin calificación
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

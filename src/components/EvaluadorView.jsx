import { useState, useEffect, useCallback } from "react";
import {
  fetchFases,
  fetchTareas,
  fetchGruposLista,
  fetchCalificacionesFase,
  fetchTodasCalificaciones,
  saveCalificacion,
  fetchProgresoGrupo,
  updateFase,
  getTimerGrupo,
  startTimerGrupo,
  stopTimerGrupo,
  fetchTimersFase,
  activarFase,
} from "../supabaseHelpers";

const inp = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 13,
  boxSizing: "border-box",
  minHeight: 44,
};

const btnStyle = (bg = "rgba(255,255,255,0.1)", clr = "#ccc") => ({
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  background: bg,
  color: clr,
  minHeight: 44,
});

export default function EvaluadorView({ session }) {
  const [fases, setFases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [selectedFaseId, setSelectedFaseId] = useState(null);
  const [selectedGrupoId, setSelectedGrupoId] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [califs, setCalifs] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [puntajes, setPuntajes] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [timerDraft, setTimerDraft] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [timerGrupo, setTimerGrupo] = useState(null);
  const [timersAll, setTimersAll] = useState([]);
  const [califsAll, setCalifsAll] = useState([]);

  const faseActiva = fases.find((f) => f.activa);
  const selectedFase = fases.find((f) => f.id === selectedFaseId);
  const isReadOnly = selectedFase ? selectedFase.bloqueada || !selectedFase.activa : true;

  const reload = useCallback(async () => {
    const [f, g, allC] = await Promise.all([fetchFases(), fetchGruposLista(), fetchTodasCalificaciones()]);
    setFases(f);
    setGrupos(g);
    setCalifsAll(allC);
    const activa = f.find((x) => x.activa);
    if (activa) {
      const tAll = await fetchTimersFase(activa.id);
      setTimersAll(tAll);
    } else {
      setTimersAll([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const id = setInterval(async () => {
      await reload();
      if (selectedFaseId && selectedGrupoId) {
        const [tg, c, p] = await Promise.all([
          getTimerGrupo(selectedGrupoId, selectedFaseId),
          fetchCalificacionesFase(selectedGrupoId, selectedFaseId),
          fetchProgresoGrupo(selectedGrupoId),
        ]);
        setTimerGrupo(tg);
        setCalifs(c);
        const pMap = {};
        p.forEach((r) => { pMap[r.tarea_id] = r.completado; });
        setProgreso(pMap);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [reload, selectedFaseId, selectedGrupoId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (fases.length > 0 && selectedFaseId === null) {
      const activa = fases.find((f) => f.activa);
      if (activa) setSelectedFaseId(activa.id);
      else {
        const cerradas = fases.filter((f) => f.bloqueada).sort((a, b) => b.orden - a.orden);
        if (cerradas.length > 0) setSelectedFaseId(cerradas[0].id);
      }
    }
  }, [fases, selectedFaseId]);

  useEffect(() => {
    if (grupos.length > 0 && selectedGrupoId === null) {
      setSelectedGrupoId(grupos[0].id);
    }
  }, [grupos, selectedGrupoId]);

  useEffect(() => {
    if (selectedFaseId) {
      fetchTareas(selectedFaseId).then(setTareas);
    } else {
      setTareas([]);
    }
  }, [selectedFaseId]);

  useEffect(() => {
    if (selectedFaseId && selectedGrupoId) {
      Promise.all([
        fetchCalificacionesFase(selectedGrupoId, selectedFaseId),
        fetchProgresoGrupo(selectedGrupoId),
        getTimerGrupo(selectedGrupoId, selectedFaseId),
      ]).then(([c, p, tg]) => {
        setCalifs(c);
        const map = {};
        c.forEach((r) => { map[r.tarea_id] = String(r.puntos); });
        setPuntajes(map);
        const pMap = {};
        p.forEach((r) => { pMap[r.tarea_id] = r.completado; });
        setProgreso(pMap);
        setTimerGrupo(tg);
      });
    } else {
      setCalifs([]);
      setPuntajes({});
      setProgreso({});
      setTimerGrupo(null);
    }
  }, [selectedFaseId, selectedGrupoId]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function timerInfo() {
    if (!faseActiva || !selectedGrupoId) return null;
    if (!timerGrupo || !timerGrupo.timer_inicio) {
      const m = faseActiva.timer_minutos || 0;
      return { text: `${String(m).padStart(2, "0")}:00`, status: "waiting", pct: 100 };
    }
    if (timerGrupo.detenido) {
      return { text: "Tiempo detenido", status: "stopped", pct: 0 };
    }
    const total = faseActiva.timer_minutos * 60 * 1000;
    const elapsed = now - new Date(timerGrupo.timer_inicio).getTime();
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

  function handlePuntaje(tareaId, value) {
    setPuntajes((p) => ({ ...p, [tareaId]: value }));
  }

  function clampPuntaje(tareaId, max) {
    setPuntajes((p) => {
      const raw = parseFloat(p[tareaId]);
      if (isNaN(raw) || raw < 0) return { ...p, [tareaId]: "0" };
      if (raw > max) return { ...p, [tareaId]: String(max) };
      return { ...p, [tareaId]: String(Math.round(raw * 10) / 10) };
    });
  }

  async function guardarCalificaciones() {
    setSaving(true);
    for (const t of tareas) {
      const val = parseFloat(puntajes[t.id]);
      const clamped = isNaN(val) ? 0 : Math.min(Math.max(0, Math.round(val * 10) / 10), t.puntos_max);
      await saveCalificacion(
        selectedGrupoId,
        t.id,
        selectedFaseId,
        clamped,
        session.id,
        session.nombre
      );
    }
    const c = await fetchCalificacionesFase(selectedGrupoId, selectedFaseId);
    setCalifs(c);
    const map = {};
    c.forEach((r) => { map[r.tarea_id] = String(r.puntos); });
    setPuntajes(map);
    setSaving(false);
    setToast("Calificaciones guardadas");
  }

  async function doStartTimer() {
    if (!selectedGrupoId || !faseActiva) return;
    await startTimerGrupo(selectedGrupoId, faseActiva.id);
    const tg = await getTimerGrupo(selectedGrupoId, faseActiva.id);
    setTimerGrupo(tg);
  }

  async function doStopTimer() {
    if (!selectedGrupoId || !faseActiva) return;
    await stopTimerGrupo(selectedGrupoId, faseActiva.id);
    const tg = await getTimerGrupo(selectedGrupoId, faseActiva.id);
    setTimerGrupo(tg);
  }

  async function doSaveTimer() {
    const val = parseInt(timerDraft);
    if (!val || val < 1 || val > 180) {
      setToast("Valor inválido (1-180 min)");
      return;
    }
    await updateFase(faseActiva.id, { timer_minutos: val });
    setTimerDraft(null);
    await reload();
    setToast("Timer actualizado");
  }

  const totalPuntaje = tareas.reduce((sum, t) => {
    const v = parseFloat(puntajes[t.id]);
    return sum + (isNaN(v) ? 0 : Math.min(v, t.puntos_max));
  }, 0);
  const maxTotal = tareas.reduce((sum, t) => sum + t.puntos_max, 0);

  const califMeta = califs.length > 0 ? califs[califs.length - 1] : null;

  const timer = timerInfo();
  const fasesDisponibles = fases.filter((f) => f.activa || f.bloqueada);

  if (!loaded) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>Cargando...</div>
        <div style={{
          marginTop: 16, width: 40, height: 4, borderRadius: 2,
          background: "#FF9800", margin: "16px auto 0",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 10, background: "#222", color: "#fff",
          fontSize: 13, fontWeight: 600, zIndex: 999,
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          {toast}
        </div>
      )}

      {/* Timer de fase activa */}
      {faseActiva && (
        <div style={{
          padding: "14px 16px", borderRadius: 14, marginBottom: 16,
          background: "rgba(255,152,0,0.08)",
          border: "1px solid rgba(255,152,0,0.2)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: timer ? 10 : 0,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#FF9800", letterSpacing: 2, textTransform: "uppercase" }}>
                FASE ACTIVA
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                {faseActiva.nombre}
              </div>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 8,
              background: "#FF9800", fontSize: 10, fontWeight: 700, color: "#000",
            }}>
              Fase {faseActiva.orden}
            </div>
          </div>

          {timer && (
            <div>
              <div style={{
                fontSize: timer.status === "expired" ? 18 : 28,
                fontWeight: 800,
                fontFamily: timer.status === "expired" ? "'Segoe UI', sans-serif" : "monospace",
                color: timer.status === "expired" ? "#ff4444" : timer.status === "waiting" ? "#888" : "#fff",
                textAlign: "center", marginBottom: 6,
              }}>
                {timer.status === "waiting" && (
                  <span style={{ fontSize: 10, display: "block", color: "#888", fontFamily: "'Segoe UI', sans-serif", fontWeight: 600, marginBottom: 2 }}>
                    Timer configurado
                  </span>
                )}
                {timer.text}
              </div>
              <div style={{
                height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 10,
              }}>
                <div style={{
                  height: "100%", borderRadius: 3, width: `${timer.pct}%`,
                  background: timer.status === "expired" ? "#ff4444" : timer.pct < 20 ? "#ff8800" : "#FF9800",
                  transition: "width 1s linear",
                }} />
              </div>
            </div>
          )}

          {selectedGrupoId && (
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
              Timer del grupo seleccionado
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {timer && timer.status === "waiting" && (
              <button onClick={doStartTimer} style={btnStyle("#FF9800", "#000")}>
                ▶ Iniciar Timer
              </button>
            )}
            {timer && timer.status === "running" && (
              <button onClick={doStopTimer} style={btnStyle()}>
                ⏹ Detener
              </button>
            )}
            {timer && (timer.status === "stopped" || timer.status === "expired") && (
              <button onClick={doStartTimer} style={btnStyle()}>
                ↻ Reiniciar
              </button>
            )}
            {timerDraft !== null ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="number" min="1" max="180" value={timerDraft}
                  onChange={(e) => setTimerDraft(e.target.value)}
                  style={{ ...inp, width: 60, textAlign: "center", padding: "6px 8px" }}
                />
                <span style={{ fontSize: 11, color: "#888" }}>min</span>
                <button onClick={doSaveTimer} style={btnStyle("#FF9800", "#000")}>✓</button>
                <button onClick={() => setTimerDraft(null)} style={btnStyle()}>✕</button>
              </div>
            ) : (
              <button onClick={() => setTimerDraft(String(faseActiva.timer_minutos))} style={btnStyle()}>
                ✏ {faseActiva.timer_minutos} min
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selector de fase */}
      {fasesDisponibles.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            FASE
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {fasesDisponibles.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFaseId(f.id)}
                style={{
                  padding: "10px 14px", borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  minHeight: 44,
                  background: selectedFaseId === f.id
                    ? (f.activa ? "#FF9800" : "#555")
                    : "rgba(255,255,255,0.06)",
                  color: selectedFaseId === f.id
                    ? (f.activa ? "#000" : "#fff")
                    : "#888",
                  transition: "background 0.2s",
                }}
              >
                {f.nombre}
                {f.bloqueada && " 🔒"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controles de fase */}
      {(() => {
        const siguienteFase = fases.find((f) => !f.activa && !f.bloqueada);
        return (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {!faseActiva && siguienteFase && (
              <button
                onClick={async () => { await activarFase(siguienteFase.id); await reload(); setToast(`${siguienteFase.nombre} activada`); }}
                style={btnStyle("#4CAF50", "#fff")}
              >
                ▶ Activar {siguienteFase.nombre}
              </button>
            )}
          </div>
        );
      })()}

      {/* Estado sin fase */}
      {!selectedFase && (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Sin fase disponible
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
            El administrador activará la primera fase cuando inicie el torneo.
          </div>
          <div style={{
            marginTop: 24, width: 40, height: 4, borderRadius: 2,
            background: "#FF9800", margin: "24px auto 0",
            animation: "pulse 2s ease-in-out infinite",
          }} />
          <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
        </div>
      )}

      {/* Selector de grupo */}
      {selectedFase && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              GRUPO
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 6,
            }}>
              {grupos.map((g) => {
                const tg = timersAll.find((t) => t.grupo_id === g.id);
                const isSelected = selectedGrupoId === g.id;
                const yaCalificado = selectedFaseId && califsAll.some(
                  (c) => c.grupo_id === g.id && c.fase_id === selectedFaseId
                );

                let bgColor = "rgba(255,255,255,0.06)";
                let txtColor = "#aaa";
                let statusLabel = null;

                if (isSelected) {
                  bgColor = "#FF9800";
                  txtColor = "#000";
                } else if (yaCalificado) {
                  bgColor = "rgba(76,175,80,0.15)";
                  txtColor = "#4CAF50";
                  statusLabel = "✓";
                } else if (tg && tg.detenido) {
                  bgColor = "rgba(255,152,0,0.15)";
                  txtColor = "#FF9800";
                  statusLabel = "Listo";
                } else if (tg && tg.timer_inicio && !tg.detenido) {
                  const rem = (faseActiva?.timer_minutos || 0) * 60 * 1000 - (now - new Date(tg.timer_inicio).getTime());
                  if (rem <= 0) {
                    bgColor = "rgba(255,152,0,0.15)";
                    txtColor = "#FF9800";
                    statusLabel = "Listo";
                  } else {
                    bgColor = "rgba(192,0,0,0.15)";
                    txtColor = "#ff6666";
                    statusLabel = "En curso";
                  }
                }

                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGrupoId(g.id)}
                    style={{
                      padding: "8px 6px", borderRadius: 8, border: "none",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      minHeight: 44,
                      background: bgColor,
                      color: txtColor,
                      transition: "background 0.2s",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 2,
                    }}
                  >
                    {g.nombre}
                    {statusLabel && !isSelected && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: yaCalificado ? "#4CAF50" : txtColor,
                      }}>
                        {statusLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Puntaje total */}
          <div style={{
            padding: "14px 16px", borderRadius: 12, marginBottom: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
                PUNTAJE TOTAL
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: totalPuntaje === maxTotal && maxTotal > 0 ? "#4CAF50" : "#fff" }}>
                {(Math.round(totalPuntaje * 10) / 10).toFixed(1)}<span style={{ fontSize: 14, color: "#888", fontWeight: 600 }}>/{maxTotal}</span>
              </div>
            </div>
            <div style={{
              height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: maxTotal > 0 ? `${(totalPuntaje / maxTotal) * 100}%` : "0%",
                background: totalPuntaje >= maxTotal * 0.8 ? "#4CAF50" : totalPuntaje >= maxTotal * 0.5 ? "#FF9800" : "#ff4444",
                transition: "width 0.3s ease",
              }} />
            </div>
            {isReadOnly && califMeta?.evaluador_nombre && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                Evaluado por: <span style={{ color: "#FF9800", fontWeight: 600 }}>{califMeta.evaluador_nombre}</span>
              </div>
            )}
          </div>

          {/* Lista de tareas para calificar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8,
            }}>
              TAREAS — {selectedFase.nombre}
              {isReadOnly && selectedFase.bloqueada && (
                <span style={{ color: "#888", fontWeight: 600, letterSpacing: 0, textTransform: "none", marginLeft: 8 }}>
                  (Solo lectura)
                </span>
              )}
            </div>

            {tareas.map((t) => {
              const checked = !!progreso[t.id];
              const califTarea = califs.find((c) => c.tarea_id === t.id);
              const value = puntajes[t.id] ?? "";

              return (
                <div key={t.id} style={{
                  padding: "14px 16px", borderRadius: 12, marginBottom: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    marginBottom: 6,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                        {t.orden}. {t.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 4, lineHeight: 1.4 }}>
                        {t.descripcion}
                      </div>
                    </div>
                  </div>

                  {/* Referencia de autoevaluación del grupo */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    marginBottom: 10, padding: "6px 10px", borderRadius: 8,
                    background: checked ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${checked ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      background: checked ? "#4CAF50" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#fff",
                    }}>
                      {checked && "✓"}
                    </div>
                    <span style={{ fontSize: 11, color: checked ? "#4CAF50" : "#666" }}>
                      {checked ? "Grupo marcó como completada" : "Grupo no completó"}
                    </span>
                  </div>

                  {/* Input de puntaje */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{ fontSize: 12, color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Puntaje:
                    </div>
                    {isReadOnly ? (
                      <div style={{
                        fontSize: 18, fontWeight: 800,
                        color: value !== "" ? "#FF9800" : "#555",
                      }}>
                        {value !== "" ? parseFloat(value).toFixed(1) : "—"}
                        <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>/{t.puntos_max}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={t.puntos_max}
                          value={value}
                          onChange={(e) => handlePuntaje(t.id, e.target.value)}
                          onBlur={() => clampPuntaje(t.id, t.puntos_max)}
                          placeholder="0"
                          aria-label={`Puntaje para ${t.titulo}`}
                          style={{
                            ...inp,
                            width: 70,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: 700,
                            padding: "8px 8px",
                          }}
                        />
                        <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>
                          / {t.puntos_max}
                        </span>
                      </div>
                    )}

                    {isReadOnly && califTarea?.evaluador_nombre && (
                      <div style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>
                        por {califTarea.evaluador_nombre}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {tareas.length === 0 && (
              <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: 20 }}>
                Sin tareas para esta fase
              </div>
            )}
          </div>

          {/* Botón guardar */}
          {!isReadOnly && (
            <button
              onClick={guardarCalificaciones}
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                fontSize: 15,
                fontWeight: 800,
                cursor: saving ? "wait" : "pointer",
                background: saving ? "#555" : "#FF9800",
                color: saving ? "#999" : "#000",
                marginBottom: 16,
                transition: "background 0.2s",
              }}
            >
              {saving ? "Guardando..." : "Guardar Calificaciones"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

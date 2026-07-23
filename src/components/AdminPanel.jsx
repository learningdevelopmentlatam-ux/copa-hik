import { useState, useEffect, useCallback } from "react";
import {
  fetchFases,
  fetchTareas,
  fetchGruposLista,
  fetchTodasCalificaciones,
  updateFase,
  updateTarea,
  createTarea,
  deleteTarea,
  activarFase,
  cerrarFase,
  fetchTimersFase,
  startTimerGrupo,
  stopTimerGrupo,
  startTimerTodos,
} from "../supabaseHelpers";

export default function AdminPanel({ session }) {
  const [fases, setFases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [califs, setCalifs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [editTareaId, setEditTareaId] = useState(null);
  const [draft, setDraft] = useState({});
  const [timerDraft, setTimerDraft] = useState(null);
  const [faseDraft, setFaseDraft] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [timersGrupo, setTimersGrupo] = useState([]);

  const reload = useCallback(async () => {
    const [f, g, c] = await Promise.all([
      fetchFases(),
      fetchGruposLista(),
      fetchTodasCalificaciones(),
    ]);
    setFases(f);
    setGrupos(g);
    setCalifs(c);
    const activa = f.find((x) => x.activa);
    if (activa) {
      const tg = await fetchTimersFase(activa.id);
      setTimersGrupo(tg);
    } else {
      setTimersGrupo([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (openId) fetchTareas(openId).then(setTareas);
    else setTareas([]);
  }, [openId]);

  useEffect(() => {
    setEditTareaId(null);
    setTimerDraft(null);
    setFaseDraft(null);
  }, [openId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const faseActiva = fases.find((f) => f.activa);

  function canActivate(fase) {
    if (fase.bloqueada || fase.activa) return false;
    if (faseActiva) return false;
    return fases.filter((f) => f.orden < fase.orden).every((f) => f.bloqueada);
  }

  function timerInfo(fase) {
    if (!fase.timer_inicio) return null;
    const rem =
      fase.timer_minutos * 60 * 1000 -
      (now - new Date(fase.timer_inicio).getTime());
    if (rem <= 0) return { text: "00:00", expired: true, pct: 0 };
    const m = Math.floor(rem / 60000);
    const sec = Math.floor((rem % 60000) / 1000);
    return {
      text: `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
      expired: false,
      pct: Math.round((rem / (fase.timer_minutos * 60 * 1000)) * 100),
    };
  }


  async function doActivar(id) {
    await activarFase(id);
    await reload();
    setToast("Fase activada");
  }

  async function doDesactivar(id) {
    if (!window.confirm("¿Desactivar esta fase? Los grupos dejarán de verla como activa.")) return;
    await updateFase(id, { activa: false });
    await reload();
    setToast("Fase desactivada");
  }

  async function doCerrar(id) {
    const fase = fases.find((f) => f.id === id);
    if (
      !window.confirm(
        `¿Cerrar "${fase?.nombre}" permanentemente?\n\nLas calificaciones quedarán bloqueadas.`
      )
    )
      return;
    await cerrarFase(id);
    await reload();
    setToast("Fase cerrada");
  }

  async function doStartTimer(id) {
    await updateFase(id, { timer_inicio: new Date().toISOString() });
    await reload();
  }

  async function doStopTimer(id) {
    await updateFase(id, { timer_inicio: null });
    await reload();
  }

  async function doSaveTimer(id) {
    const val = parseInt(timerDraft);
    if (!val || val < 1 || val > 180) {
      setToast("Valor inválido (1-180 min)");
      return;
    }
    await updateFase(id, { timer_minutos: val });
    setTimerDraft(null);
    await reload();
    setToast("Timer actualizado");
  }

  async function doSaveFaseNombre(id) {
    if (!faseDraft?.trim()) {
      setToast("Nombre vacío");
      return;
    }
    await updateFase(id, { nombre: faseDraft.trim() });
    setFaseDraft(null);
    await reload();
    setToast("Nombre actualizado");
  }

  function startEdit(t) {
    setEditTareaId(t.id);
    setDraft({
      titulo: t.titulo,
      descripcion: t.descripcion,
      puntos_max: String(t.puntos_max),
      limite_caracteres: String(t.limite_caracteres),
    });
  }

  async function doSaveTarea() {
    await updateTarea(editTareaId, {
      titulo: draft.titulo,
      descripcion: draft.descripcion,
      puntos_max: parseFloat(draft.puntos_max) || 2.0,
      limite_caracteres: parseInt(draft.limite_caracteres) || 500,
    });
    setEditTareaId(null);
    fetchTareas(openId).then(setTareas);
    setToast("Tarea actualizada");
  }

  const inp = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#fff",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
  };

  const btn = (bg = "rgba(255,255,255,0.1)", clr = "#ccc") => ({
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

  if (!loaded) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>Cargando panel...</div>
        <div style={{
          marginTop: 16, width: 40, height: 4, borderRadius: 2,
          background: "#C00000", margin: "16px auto 0",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            borderRadius: 10,
            background: "#222",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#666",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        FASES DEL TORNEO
      </div>

      {fases.map((fase) => {
        const isOpen = openId === fase.id;
        const timer = timerInfo(fase);
        const active = fase.activa;
        const locked = fase.bloqueada;

        return (
          <div key={fase.id} style={{ marginBottom: isOpen ? 16 : 8 }}>
            <div
              onClick={() => setOpenId(isOpen ? null : fase.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: isOpen ? "12px 12px 0 0" : 12,
                cursor: "pointer",
                background: active
                  ? "rgba(192,0,0,0.12)"
                  : locked
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${active ? "rgba(192,0,0,0.25)" : "rgba(255,255,255,0.08)"}`,
                borderBottom: isOpen ? "none" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: active
                      ? "rgba(192,0,0,0.2)"
                      : "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {locked ? "🔒" : active ? "▶️" : "⏳"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: locked ? "#888" : "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Fase {fase.orden}: {fase.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    ⏱ {fase.timer_minutos} min
                    {timer && !timer.expired && ` · ${timer.text}`}
                    {timer?.expired && (
                      <span style={{ color: "#ff4444" }}>
                        {" "}
                        · TIEMPO AGOTADO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {canActivate(fase) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      doActivar(fase.id);
                    }}
                    style={btn("#C00000", "#fff")}
                  >
                    Activar
                  </button>
                )}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "#fff",
                    background: locked
                      ? "#555"
                      : active
                        ? "#C00000"
                        : "rgba(255,255,255,0.1)",
                  }}
                >
                  {locked ? "CERRADA" : active ? "ACTIVA" : "PENDIENTE"}
                </span>
              </div>
            </div>

            {isOpen && (
              <div
                style={{
                  padding: 16,
                  borderRadius: "0 0 12px 12px",
                  background: active
                    ? "rgba(192,0,0,0.06)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(192,0,0,0.25)" : "rgba(255,255,255,0.08)"}`,
                  borderTop: "none",
                }}
              >
                {active && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginBottom: 8,
                        fontWeight: 700,
                      }}
                    >
                      TIMER
                    </div>

                    {timer && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 36,
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: timer.expired ? "#ff4444" : "#fff",
                            textAlign: "center",
                            marginBottom: 8,
                          }}
                        >
                          {timer.text}
                        </div>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: "rgba(255,255,255,0.1)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 2,
                              width: `${timer.pct}%`,
                              background: timer.expired
                                ? "#ff4444"
                                : timer.pct < 20
                                  ? "#ff8800"
                                  : "#C00000",
                              transition: "width 1s linear",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!timer ? (
                        <button
                          onClick={() => doStartTimer(fase.id)}
                          style={btn("#C00000", "#fff")}
                        >
                          ▶ Iniciar
                        </button>
                      ) : (
                        <button
                          onClick={() => doStopTimer(fase.id)}
                          style={btn()}
                        >
                          ⏹ Detener
                        </button>
                      )}
                      {timerDraft !== null ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={timerDraft}
                            onChange={(e) => setTimerDraft(e.target.value)}
                            style={{
                              ...inp,
                              width: 60,
                              textAlign: "center",
                              padding: "6px 8px",
                            }}
                          />
                          <span style={{ fontSize: 11, color: "#888" }}>
                            min
                          </span>
                          <button
                            onClick={() => doSaveTimer(fase.id)}
                            style={btn("#C00000", "#fff")}
                          >
                            ✓
                          </button>
                          <button onClick={() => setTimerDraft(null)} style={btn()}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setTimerDraft(String(fase.timer_minutos))
                          }
                          style={btn()}
                        >
                          ✏ {fase.timer_minutos} min
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!active && !locked && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginBottom: 6,
                        fontWeight: 700,
                      }}
                    >
                      TIMER
                    </div>
                    {timerDraft !== null ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={timerDraft}
                          onChange={(e) => setTimerDraft(e.target.value)}
                          style={{ ...inp, width: 80, textAlign: "center" }}
                        />
                        <span style={{ fontSize: 11, color: "#888" }}>
                          minutos
                        </span>
                        <button
                          onClick={() => doSaveTimer(fase.id)}
                          style={btn("#C00000", "#fff")}
                        >
                          ✓
                        </button>
                        <button onClick={() => setTimerDraft(null)} style={btn()}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() =>
                          setTimerDraft(String(fase.timer_minutos))
                        }
                        style={{
                          fontSize: 14,
                          color: "#ccc",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        ⏱ {fase.timer_minutos} minutos
                        <span style={{ fontSize: 12, color: "#666" }}>✏</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#888",
                      marginBottom: 6,
                      fontWeight: 700,
                    }}
                  >
                    NOMBRE
                  </div>
                  {faseDraft !== null ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={faseDraft}
                        onChange={(e) => setFaseDraft(e.target.value)}
                        style={inp}
                      />
                      <button
                        onClick={() => doSaveFaseNombre(fase.id)}
                        style={btn("#C00000", "#fff")}
                      >
                        ✓
                      </button>
                      <button onClick={() => setFaseDraft(null)} style={btn()}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !locked && setFaseDraft(fase.nombre)}
                      style={{
                        fontSize: 14,
                        color: locked ? "#666" : "#fff",
                        cursor: locked ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {fase.nombre}
                      {!locked && (
                        <span style={{ fontSize: 12, color: "#666" }}>✏</span>
                      )}
                    </div>
                  )}
                </div>

                {!locked && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    {canActivate(fase) && (
                      <button
                        onClick={() => doActivar(fase.id)}
                        style={btn("#C00000", "#fff")}
                      >
                        ▶ Activar Fase
                      </button>
                    )}
                    {active && (
                      <>
                        <button
                          onClick={() => doCerrar(fase.id)}
                          style={btn("#8B0000", "#fff")}
                        >
                          🔒 Cerrar Fase
                        </button>
                        <button
                          onClick={() => doDesactivar(fase.id)}
                          style={btn()}
                        >
                          ⏸ Desactivar
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 11,
                    color: "#888",
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  TAREAS ({tareas.length})
                </div>

                {tareas.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      marginBottom: 6,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {editTareaId === t.id ? (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#888",
                              marginBottom: 4,
                            }}
                          >
                            Título
                          </div>
                          <input
                            value={draft.titulo}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                titulo: e.target.value,
                              }))
                            }
                            style={inp}
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#888",
                              marginBottom: 4,
                            }}
                          >
                            Descripción
                          </div>
                          <textarea
                            value={draft.descripcion}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                descripcion: e.target.value,
                              }))
                            }
                            style={{
                              ...inp,
                              resize: "vertical",
                              minHeight: 80,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                marginBottom: 4,
                              }}
                            >
                              Puntos máx
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={draft.puntos_max}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  puntos_max: e.target.value,
                                }))
                              }
                              style={inp}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                marginBottom: 4,
                              }}
                            >
                              Límite chars
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={draft.limite_caracteres}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  limite_caracteres: e.target.value,
                                }))
                              }
                              style={inp}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={doSaveTarea}
                            style={btn("#C00000", "#fff")}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditTareaId(null)}
                            style={btn()}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: locked ? "#888" : "#fff",
                              flex: 1,
                            }}
                          >
                            {t.orden}. {t.titulo}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#C00000",
                              whiteSpace: "nowrap",
                              marginLeft: 8,
                            }}
                          >
                            {t.puntos_max} pts
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#999",
                            marginTop: 6,
                            lineHeight: 1.4,
                          }}
                        >
                          {t.descripcion}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 8,
                          }}
                        >
                          <span style={{ fontSize: 10, color: "#666" }}>
                            Límite: {t.limite_caracteres} chars
                          </span>
                          {!locked && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => startEdit(t)}
                                style={btn()}
                              >
                                Editar
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`¿Eliminar "${t.titulo}"?`)) return;
                                  await deleteTarea(t.id);
                                  setTareas(await fetchTareas(fase.id));
                                  setToast("Tarea eliminada");
                                }}
                                style={btn("#ff4444", "#fff")}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {tareas.length === 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    Sin tareas configuradas
                  </div>
                )}

                {!locked && (
                  <button
                    onClick={async () => {
                      const orden = tareas.length + 1;
                      await createTarea(fase.id, orden);
                      setTareas(await fetchTareas(fase.id));
                      setToast("Tarea agregada");
                    }}
                    style={{ ...btn("#C00000", "#fff"), width: "100%", marginTop: 8 }}
                  >
                    + Agregar tarea
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {fases.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "#666",
            textAlign: "center",
            padding: 20,
          }}
        >
          Sin fases configuradas
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#666",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        GRUPOS
      </div>

      {faseActiva && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={async () => { await startTimerTodos(faseActiva.id, grupos.map((g) => g.id)); await reload(); setToast("Todos los timers iniciados"); }}
            style={btn("#C00000", "#fff")}
          >
            ▶ Iniciar Todos
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {grupos.map((g) => {
          const tg = timersGrupo.find((t) => t.grupo_id === g.id);
          const fasesConCal = fases.map((fase) => {
            const calsGrupo = califs.filter(
              (c) => c.grupo_id === g.id && c.fase_id === fase.id
            );
            const total = calsGrupo.reduce((s, c) => s + Number(c.puntos || 0), 0);
            const count = calsGrupo.length;
            return { fase, total, count };
          });

          const fasesCerradasConCal = fasesConCal.filter((f) => f.fase.bloqueada && f.count > 0);
          const promedioTotal = fasesCerradasConCal.length > 0
            ? fasesCerradasConCal.reduce((s, f) => s + f.total, 0) / fasesCerradasConCal.length
            : null;

          let timerStatus = "none";
          let timerText = "";
          if (faseActiva && tg && tg.timer_inicio) {
            if (tg.detenido) {
              timerStatus = "stopped";
              timerText = "Detenido";
            } else {
              const total = faseActiva.timer_minutos * 60 * 1000;
              const elapsed = now - new Date(tg.timer_inicio).getTime();
              const rem = total - elapsed;
              if (rem <= 0) {
                timerStatus = "expired";
                timerText = "Agotado";
              } else {
                timerStatus = "running";
                const m = Math.floor(rem / 60000);
                const sec = Math.floor((rem % 60000) / 1000);
                timerText = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
              }
            }
          }

          return (
            <div
              key={g.id}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  👥 {g.nombre}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {promedioTotal !== null && (
                    <span style={{
                      fontSize: 13, fontWeight: 800,
                      color: promedioTotal >= 8 ? "#4CAF50" : promedioTotal >= 5 ? "#FF9800" : "#ff4444",
                    }}>
                      {promedioTotal.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer del grupo */}
              {faseActiva && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 8,
                }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, fontFamily: timerStatus === "running" ? "monospace" : "inherit",
                    color: timerStatus === "running" ? "#fff"
                      : timerStatus === "stopped" ? "#FF9800"
                      : timerStatus === "expired" ? "#ff4444"
                      : "#555",
                    minWidth: 55,
                  }}>
                    {timerStatus === "none" ? "—" : timerText}
                  </div>
                  {timerStatus === "none" && (
                    <button
                      onClick={async () => { await startTimerGrupo(g.id, faseActiva.id); await reload(); }}
                      style={{ ...btn("#C00000", "#fff"), padding: "6px 12px", fontSize: 11, minHeight: 32 }}
                    >
                      ▶ Iniciar
                    </button>
                  )}
                  {timerStatus === "running" && (
                    <button
                      onClick={async () => { await stopTimerGrupo(g.id, faseActiva.id); await reload(); }}
                      style={{ ...btn(), padding: "6px 12px", fontSize: 11, minHeight: 32 }}
                    >
                      ⏹ Detener
                    </button>
                  )}
                  {(timerStatus === "stopped" || timerStatus === "expired") && (
                    <button
                      onClick={async () => { await startTimerGrupo(g.id, faseActiva.id); await reload(); }}
                      style={{ ...btn(), padding: "6px 12px", fontSize: 11, minHeight: 32 }}
                    >
                      ↻ Reiniciar
                    </button>
                  )}
                </div>
              )}

              {/* Fases calificadas */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {fasesConCal.map(({ fase, total, count }) => (
                  <div
                    key={fase.id}
                    style={{
                      flex: 1, minWidth: 50,
                      padding: "4px 6px", borderRadius: 6,
                      background: count > 0
                        ? "rgba(76,175,80,0.1)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${count > 0 ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.06)"}`,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 9, color: "#888", fontWeight: 600 }}>
                      F{fase.orden}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, marginTop: 1,
                      color: count > 0 ? "#4CAF50" : "#555",
                    }}>
                      {count > 0 ? total.toFixed(1) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {grupos.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "#666",
            textAlign: "center",
            padding: 20,
          }}
        >
          Sin grupos registrados
        </div>
      )}
    </div>
  );
}

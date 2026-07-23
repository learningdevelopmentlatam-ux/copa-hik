import { supabase } from "./supabaseClient";

// ── Auth: Login ─────────────────────────────────────────────────────────────

export async function loginGrupo(grupoId, password) {
  const { data } = await supabase
    .from("copa_grupos")
    .select("id, nombre")
    .eq("id", grupoId)
    .eq("password", password)
    .single();
  return data ? { tipo: "grupo", id: data.id, nombre: data.nombre, grupo_id: data.id } : null;
}

export async function loginEvaluador(usuarioId, password) {
  const { data } = await supabase
    .from("copa_usuarios")
    .select("id, nombre, rol")
    .eq("id", usuarioId)
    .eq("password", password)
    .single();
  if (!data) return null;
  return {
    tipo: "evaluador",
    id: data.id,
    nombre: data.nombre,
    rol: data.rol,
    esAdmin: data.rol === "superadmin",
  };
}

// ── Auth: Listas para dropdowns (sin passwords) ────────────────────────────

export async function fetchGruposLista() {
  const { data } = await supabase
    .from("copa_grupos")
    .select("id, nombre")
    .order("id");
  return data || [];
}

export async function fetchEvaluadoresLista() {
  const { data } = await supabase
    .from("copa_usuarios")
    .select("id, nombre")
    .order("id");
  return data || [];
}

// ── Fases ───────────────────────────────────────────────────────────────────

export async function fetchFases() {
  const { data } = await supabase
    .from("copa_fases")
    .select("*")
    .order("orden");
  return data || [];
}

export async function updateFase(id, updates) {
  const { data } = await supabase
    .from("copa_fases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return data;
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export async function fetchTareas(faseId) {
  const { data } = await supabase
    .from("copa_tareas")
    .select("*")
    .eq("fase_id", faseId)
    .order("orden");
  return data || [];
}

export async function fetchTodasTareas() {
  const { data } = await supabase
    .from("copa_tareas")
    .select("*")
    .order("fase_id")
    .order("orden");
  return data || [];
}

// ── Progreso del grupo (autoevaluacion) ─────────────────────────────────────

export async function saveProgresoGrupo(grupoId, tareaId, completado) {
  await supabase
    .from("copa_progreso_grupo")
    .upsert(
      { grupo_id: grupoId, tarea_id: tareaId, completado, updated_at: new Date().toISOString() },
      { onConflict: "grupo_id,tarea_id" }
    );
}

export async function fetchProgresoGrupo(grupoId) {
  const { data } = await supabase
    .from("copa_progreso_grupo")
    .select("*")
    .eq("grupo_id", grupoId);
  return data || [];
}

// ── Calificaciones (evaluador) ──────────────────────────────────────────────

export async function saveCalificacion(grupoId, tareaId, faseId, puntos, evaluadorId, evaluadorNombre) {
  await supabase
    .from("copa_calificaciones")
    .upsert(
      {
        grupo_id: grupoId,
        tarea_id: tareaId,
        fase_id: faseId,
        puntos,
        evaluador_id: evaluadorId,
        evaluador_nombre: evaluadorNombre,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "grupo_id,tarea_id" }
    );
}

export async function fetchCalificacionesFase(grupoId, faseId) {
  const { data } = await supabase
    .from("copa_calificaciones")
    .select("*")
    .eq("grupo_id", grupoId)
    .eq("fase_id", faseId);
  return data || [];
}

export async function fetchTodasCalificaciones() {
  const { data } = await supabase
    .from("copa_calificaciones")
    .select("*");
  return data || [];
}

// ── Config global ───────────────────────────────────────────────────────────

export async function getConfig(key) {
  const { data } = await supabase
    .from("copa_config")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value || null;
}

export async function setConfig(key, value) {
  await supabase
    .from("copa_config")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

// ── Timer por grupo ────────────────────────────────────────────────────────

export async function startTimerGrupo(grupoId, faseId) {
  await supabase
    .from("copa_timer_grupo")
    .upsert(
      { grupo_id: grupoId, fase_id: faseId, timer_inicio: new Date().toISOString(), detenido: false, updated_at: new Date().toISOString() },
      { onConflict: "grupo_id,fase_id" }
    );
}

export async function stopTimerGrupo(grupoId, faseId) {
  await supabase
    .from("copa_timer_grupo")
    .upsert(
      { grupo_id: grupoId, fase_id: faseId, detenido: true, updated_at: new Date().toISOString() },
      { onConflict: "grupo_id,fase_id" }
    );
}

export async function getTimerGrupo(grupoId, faseId) {
  const { data } = await supabase
    .from("copa_timer_grupo")
    .select("*")
    .eq("grupo_id", grupoId)
    .eq("fase_id", faseId)
    .single();
  return data || null;
}

export async function fetchTimersFase(faseId) {
  const { data } = await supabase
    .from("copa_timer_grupo")
    .select("*")
    .eq("fase_id", faseId);
  return data || [];
}

export async function startTimerTodos(faseId, grupoIds) {
  const ahora = new Date().toISOString();
  const rows = grupoIds.map((gid) => ({
    grupo_id: gid,
    fase_id: faseId,
    timer_inicio: ahora,
    detenido: false,
    updated_at: ahora,
  }));
  await supabase
    .from("copa_timer_grupo")
    .upsert(rows, { onConflict: "grupo_id,fase_id" });
}

// ── Fases: Acciones del admin ──────────────────────────────────────────────

export async function activarFase(faseId) {
  await supabase.from("copa_fases").update({ activa: false }).eq("activa", true);
  const { data } = await supabase
    .from("copa_fases")
    .update({ activa: true })
    .eq("id", faseId)
    .select()
    .single();
  return data;
}

export async function cerrarFase(faseId) {
  const { data } = await supabase
    .from("copa_fases")
    .update({ activa: false, bloqueada: true })
    .eq("id", faseId)
    .select()
    .single();
  return data;
}

// ── Tareas: Edicion ────────────────────────────────────────────────────────

export async function updateTarea(id, updates) {
  const { data } = await supabase
    .from("copa_tareas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return data;
}

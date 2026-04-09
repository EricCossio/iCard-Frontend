import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogout } from "../hooks/useAuth";
import api from "../api/axios";

// ── Schema ───────────────────────────────────────────────
const tareaSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().optional(),
  categoria: z.enum(["trabajo","personal","deporte","ejercicio","videojuego","juego","familiar","salud","musica","otro"]),
  estado: z.enum(["pendiente","en_progreso","completada"]),
  fecha: z.string().min(1, "La fecha es requerida"),
  hora_inicio: z.string().optional(),
  hora_fin: z.string().optional(),
});

// ── API ──────────────────────────────────────────────────
const fetchTareas       = async () => { const { data } = await api.get("/tareas/"); return data; };
const crearTarea        = async (t) => { const { data } = await api.post("/tareas/", t); return data; };
const editarTarea       = async ({ id, ...t }) => { const { data } = await api.patch(`/tareas/${id}/`, t); return data; };
const eliminarTarea     = async (id) => { await api.delete(`/tareas/${id}/`); };
const fetchMe           = async () => { const { data } = await api.get("/auth/me/"); return data; };
const updateMe          = async (body) => { const { data } = await api.patch("/auth/me/", body); return data; };
const fetchInvitaciones = async () => { const { data } = await api.get("/invitaciones/"); return data; };
const invitarUsuario    = async ({ tarea, invitado }) => { const { data } = await api.post("/invitaciones/", { tarea, invitado }); return data; };
const responderInv      = async ({ id, estado }) => { const { data } = await api.patch(`/invitaciones/${id}/`, { estado }); return data; };
const cancelarInv       = async (id) => { await api.delete(`/invitaciones/${id}/`); };
const buscarUsuarios    = async (q) => { const { data } = await api.get(`/users/?search=${q}`); return data; };

// ── Configs ───────────────────────────────────────────────
const CATS = {
  trabajo:    { color: "#22d3ee", bg: "rgba(34,211,238,0.12)",   border: "rgba(34,211,238,0.25)",   label: "Trabajo",    icon: "💼" },
  personal:   { color: "#a78bfa", bg: "rgba(167,139,250,0.12)",  border: "rgba(167,139,250,0.25)",  label: "Personal",   icon: "🌿" },
  deporte:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)",   border: "rgba(251,146,60,0.25)",   label: "Deporte",    icon: "⚽" },
  ejercicio:  { color: "#f472b6", bg: "rgba(244,114,182,0.12)",  border: "rgba(244,114,182,0.25)",  label: "Ejercicio",  icon: "🏋️" },
  videojuego: { color: "#34d399", bg: "rgba(52,211,153,0.12)",   border: "rgba(52,211,153,0.25)",   label: "Videojuego", icon: "🎮" },
  juego:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",   border: "rgba(251,191,36,0.25)",   label: "Juego",      icon: "🕹️" },
  familiar:   { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",   border: "rgba(96,165,250,0.25)",   label: "Familiar",   icon: "👪" },
  salud:      { color: "#f87171", bg: "rgba(248,113,113,0.12)",  border: "rgba(248,113,113,0.25)",  label: "Salud",      icon: "❤️" },
  musica:     { color: "#e879f9", bg: "rgba(232,121,249,0.12)",  border: "rgba(232,121,249,0.25)",  label: "Música",     icon: "🎵" },
  otro:       { color: "#94a3b8", bg: "rgba(148,163,184,0.12)",  border: "rgba(148,163,184,0.25)",  label: "Otro",       icon: "✦"  },
};

const ESTADOS = {
  pendiente:   { color: "#fbbf24", label: "Pendiente",   icon: "○" },
  en_progreso: { color: "#22d3ee", label: "En progreso", icon: "◑" },
  completada:  { color: "#4ade80", label: "Completada",  icon: "●" },
};

// ── Helpers ───────────────────────────────────────────────
const today    = () => new Date().toISOString().split("T")[0];
const fmtHora  = (h) => h ? h.slice(0, 5) : "";
const fmtFecha = (f) => new Date(f + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const isToday  = (f) => f === today();
const getIniciales = (user) => {
  if (!user) return "?";
  return (`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`).toUpperCase() || user.username?.[0]?.toUpperCase() || "?";
};

const inputCls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-400/50 transition-all w-full placeholder-white/20";

// ── Field wrapper ─────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold tracking-widest uppercase text-white/40">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400 flex gap-1"><span>⚠</span>{error.message}</p>}
  </div>
);

// ══════════════════════════════════════════════════════════
// ── CAMPANA DE NOTIFICACIONES ─────────────────────────────
// ══════════════════════════════════════════════════════════
const Notificaciones = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc  = useQueryClient();

  const { data: invData } = useQuery({
    queryKey: ["invitaciones"],
    queryFn: fetchInvitaciones,
    refetchInterval: 30000,
  });

  const invitaciones = invData?.results || invData || [];
  const pendientes   = invitaciones.filter((inv) => inv.estado === "pendiente" && inv.invitado === userId);
  const enviadas     = invitaciones.filter((inv) => inv.invitado_por === userId);

  const responderMutation = useMutation({
    mutationFn: responderInv,
    onSuccess: () => { qc.invalidateQueries(["invitaciones"]); qc.invalidateQueries(["tareas"]); },
  });

  const cancelarMutation = useMutation({
    mutationFn: cancelarInv,
    onSuccess: () => qc.invalidateQueries(["invitaciones"]),
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const estadoColor = { pendiente: "#fbbf24", aceptada: "#4ade80", rechazada: "#f87171" };
  const estadoIcon  = { pendiente: "○", aceptada: "●", rechazada: "✕" };

  return (
    <div className="relative" ref={ref}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
        style={{
          background: open ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: open ? "#22d3ee" : "rgba(255,255,255,0.5)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {pendientes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #f87171, #ef4444)" }}>
            {pendientes.length > 9 ? "9+" : pendientes.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl overflow-auto"
          style={{ background: "linear-gradient(160deg, #0f0a2a, #060412)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)", maxHeight: "480px" }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2 sticky top-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(160deg, #0f0a2a, #060412)" }}>
            <span className="font-bold text-white text-sm">Notificaciones</span>
            {pendientes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: "rgba(248,113,113,0.8)" }}>
                {pendientes.length} nueva{pendientes.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Pendientes recibidas */}
          {pendientes.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 py-1">Invitaciones recibidas</p>
              {pendientes.map((inv) => (
                <div key={inv.id} className="rounded-xl p-3 mb-1"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #22d3ee)" }}>
                      {getIniciales(inv.invitado_por_info)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-semibold leading-tight">
                        <span style={{ color: "#22d3ee" }}>@{inv.invitado_por_info?.username}</span>{" "}te invitó a
                      </p>
                      <p className="text-xs text-white/60 truncate mt-0.5">📋 {inv.tarea_titulo}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => responderMutation.mutate({ id: inv.id, estado: "aceptada" })}
                      disabled={responderMutation.isPending}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                      ✓ Aceptar
                    </button>
                    <button onClick={() => responderMutation.mutate({ id: inv.id, estado: "rechazada" })}
                      disabled={responderMutation.isPending}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enviadas */}
          {enviadas.length > 0 && (
            <div className="p-2" style={{ borderTop: pendientes.length > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 py-1">Invitaciones enviadas</p>
              {enviadas.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                    {getIniciales(inv.invitado_info)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 truncate">
                      <span className="text-white/80">@{inv.invitado_info?.username}</span>{" · "}{inv.tarea_titulo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-semibold" style={{ color: estadoColor[inv.estado] }}>
                      {estadoIcon[inv.estado]} {inv.estado}
                    </span>
                    {inv.estado === "pendiente" && (
                      <button onClick={() => cancelarMutation.mutate(inv.id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/15 transition-all text-xs">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {pendientes.length === 0 && enviadas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="text-3xl opacity-20">🔔</span>
              <p className="text-xs text-white/20">Sin notificaciones</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── MENÚ DE PERFIL ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
const PerfilMenu = ({ onLogout }) => {
  const [open, setOpen]         = useState(false);
  const [editando, setEditando] = useState(false);
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { register, handleSubmit, reset } = useForm({ defaultValues: { first_name: "", last_name: "", email: "" } });

  useEffect(() => {
    if (user) reset({ first_name: user.first_name || "", last_name: user.last_name || "", email: user.email || "" });
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => { qc.invalidateQueries(["me"]); setEditando(false); },
  });

  const iniciales = getIniciales(user);
  const cerrar = () => { setOpen(false); setEditando(false); };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)", boxShadow: open ? "0 0 20px rgba(34,211,238,0.3)" : "none" }}>
        {isLoading ? "·" : iniciales}
      </button>

      {open && <div className="fixed inset-0 z-40" onClick={cerrar} />}

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0f0a2a, #060412)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>

          <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                {iniciales}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-white/40 truncate">@{user?.username}</p>
                <p className="text-xs text-white/30 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {editando ? (
            <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest">Nombre</label>
                  <input {...register("first_name")} className={inputCls} placeholder="Nombre" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest">Apellido</label>
                  <input {...register("last_name")} className={inputCls} placeholder="Apellido" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Email</label>
                <input type="email" {...register("email")} className={inputCls} placeholder="Email" />
              </div>
              {updateMutation.error && <p className="text-xs text-red-400">Error al guardar.</p>}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setEditando(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={updateMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-2">
              <button onClick={() => setEditando(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <span>✏️</span><span>Editar perfil</span>
              </button>
              <button onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                style={{ color: "rgba(248,113,113,0.7)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(248,113,113,0.7)"; }}>
                <span>⎋</span><span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── BUSCADOR DE USUARIOS PARA INVITAR ─────────────────────
// ══════════════════════════════════════════════════════════
const BuscadorUsuarios = ({ tareaId }) => {
  const [query, setQuery]           = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data: resultados, isFetching } = useQuery({
    queryKey: ["usuarios-busqueda", debouncedQ],
    queryFn: () => buscarUsuarios(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 30000,
  });

  const invitarMutation = useMutation({
    mutationFn: invitarUsuario,
    onSuccess: () => { qc.invalidateQueries(["invitaciones"]); setQuery(""); },
  });

  const usuarios = resultados?.results || resultados || [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputCls + " pl-8"}
          placeholder="Buscar por username, nombre..."
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
          {isFetching ? "⟳" : "⌕"}
        </span>
      </div>

      {debouncedQ.length >= 2 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {usuarios.length === 0 && !isFetching ? (
            <p className="text-xs text-white/30 text-center py-3">Sin resultados para "{debouncedQ}"</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 transition-all"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                  {getIniciales(u)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                  </p>
                  <p className="text-[10px] text-white/40">@{u.username}</p>
                </div>
                <button
                  onClick={() => invitarMutation.mutate({ tarea: tareaId, invitado: u.id })}
                  disabled={invitarMutation.isPending}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                  {invitarMutation.isPending ? "..." : "+ Invitar"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {invitarMutation.isError && (
        <p className="text-xs text-red-400">
          {invitarMutation.error?.response?.data?.non_field_errors?.[0] || "Error. ¿Ya fue invitado?"}
        </p>
      )}
      {invitarMutation.isSuccess && (
        <p className="text-xs" style={{ color: "#4ade80" }}>✓ Invitación enviada correctamente</p>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── MODAL CREAR / EDITAR TAREA ────────────────────────────
// ══════════════════════════════════════════════════════════
const TareaModal = ({ onClose, tareaEdit }) => {
  const qc     = useQueryClient();
  const isEdit = !!tareaEdit;
  const [tareaCreada, setTareaCreada] = useState(null);
  const [tab, setTab]                 = useState("datos");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(tareaSchema),
    defaultValues: tareaEdit || { categoria: "trabajo", estado: "pendiente", fecha: today() },
  });

  const mutation = useMutation({
    mutationFn: isEdit ? editarTarea : crearTarea,
    onSuccess: (data) => {
      qc.invalidateQueries(["tareas"]);
      if (!isEdit) {
        setTareaCreada(data);
        setTab("invitar"); // después de crear → pestaña invitar
      } else {
        onClose();
      }
    },
  });

  const onSubmit = (data) => {
    if (!data.hora_inicio) delete data.hora_inicio;
    if (!data.hora_fin)    delete data.hora_fin;
    if (!data.descripcion) delete data.descripcion;
    mutation.mutate(isEdit ? { id: tareaEdit.id, ...data } : data);
  };

  const tareaActual = tareaCreada || tareaEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f0a2a, #060412)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">
                {tab === "invitar" ? "Invitar colaboradores" : isEdit ? "Editar tarea" : "Nueva tarea"}
              </h3>
              <p className="text-xs text-white/30 mt-0.5">
                {tab === "invitar"
                  ? `📋 ${tareaActual?.titulo}`
                  : isEdit ? "Modifica los datos de tu tarea" : "Agrega una nueva actividad a tu día"}
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all text-lg">✕</button>
          </div>

          {/* Tabs — solo en edición o después de crear */}
          {(isEdit || tareaCreada) && (
            <div className="flex gap-1 mt-4">
              {[{ id: "datos", label: "📋 Datos" }, { id: "invitar", label: "👥 Invitar" }].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={tab === t.id
                    ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                    : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        {tab === "datos" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
            <Field label="Título" error={errors.titulo}>
              <input {...register("titulo")} className={inputCls} placeholder="¿Qué vas a hacer?" />
            </Field>
            <Field label="Descripción" error={errors.descripcion}>
              <textarea {...register("descripcion")} rows={2} className={inputCls + " resize-none"} placeholder="Notas adicionales (opcional)" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoría" error={errors.categoria}>
                <select {...register("categoria")} className={inputCls + " cursor-pointer"}>
                  {Object.entries(CATS).map(([val, c]) => (
                    <option key={val} value={val}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado" error={errors.estado}>
                <select {...register("estado")} className={inputCls + " cursor-pointer"}>
                  <option value="pendiente">○ Pendiente</option>
                  <option value="en_progreso">◑ En progreso</option>
                  <option value="completada">● Completada</option>
                </select>
              </Field>
            </div>
            <Field label="Fecha" error={errors.fecha}>
              <input type="date" {...register("fecha")} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora inicio" error={errors.hora_inicio}>
                <input type="time" {...register("hora_inicio")} className={inputCls} />
              </Field>
              <Field label="Hora fin" error={errors.hora_fin}>
                <input type="time" {...register("hora_fin")} className={inputCls} />
              </Field>
            </div>
            {mutation.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400">Error al guardar. Intenta de nuevo.</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancelar
              </button>
              <button type="submit" disabled={mutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white tracking-wide transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "✦ Crear tarea"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            <BuscadorUsuarios tareaId={tareaActual?.id} />
            <button onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all mt-2"
              style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {tareaCreada ? "✓ Listo" : "Cerrar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── TARJETA DE TAREA ──────────────────────────────────────
// ══════════════════════════════════════════════════════════
const TareaCard = ({ tarea, onEdit, onDelete, onToggle }) => {
  const cat  = CATS[tarea.categoria] || CATS.otro;
  const est  = ESTADOS[tarea.estado] || ESTADOS.pendiente;
  const done = tarea.estado === "completada";

  const { data: invData } = useQuery({ queryKey: ["invitaciones"], queryFn: fetchInvitaciones });
  const invitaciones  = invData?.results || invData || [];
  const colaboradores = invitaciones.filter((inv) => inv.tarea === tarea.id && inv.estado === "aceptada");

  return (
    <div className="group flex gap-3 p-4 rounded-2xl transition-all duration-200 hover:translate-x-1"
      style={{ background: done ? "rgba(255,255,255,0.02)" : cat.bg, border: `1px solid ${done ? "rgba(255,255,255,0.04)" : cat.border}` }}>

      <div className="flex flex-col items-center gap-1 w-12 flex-shrink-0">
        {tarea.hora_inicio ? (
          <>
            <span className="text-[10px] font-mono font-bold" style={{ color: done ? "rgba(255,255,255,0.2)" : cat.color }}>
              {fmtHora(tarea.hora_inicio)}
            </span>
            <div className="w-px flex-1" style={{ background: done ? "rgba(255,255,255,0.05)" : `${cat.color}25`, minHeight: "8px" }} />
            {tarea.hora_fin && <span className="text-[10px] font-mono text-white/20">{fmtHora(tarea.hora_fin)}</span>}
          </>
        ) : (
          <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: done ? "rgba(255,255,255,0.1)" : cat.color }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base flex-shrink-0" style={{ opacity: done ? 0.3 : 1 }}>{cat.icon}</span>
            <h4 className={`font-bold text-sm truncate ${done ? "line-through text-white/25" : "text-white"}`}>
              {tarea.titulo}
            </h4>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button onClick={() => onToggle(tarea)} title={done ? "Desmarcar" : "Completar"}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{ background: done ? "rgba(255,255,255,0.05)" : `${ESTADOS.completada.color}20`, color: done ? "rgba(255,255,255,0.3)" : ESTADOS.completada.color }}>
              {done ? "↩" : "✓"}
            </button>
            <button onClick={() => onEdit(tarea)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all text-xs">✏</button>
            <button onClick={() => onDelete(tarea.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/15 transition-all text-sm">✕</button>
          </div>
        </div>

        {tarea.descripcion && <p className="text-xs text-white/30 mt-1 ml-7 truncate">{tarea.descripcion}</p>}

        <div className="flex items-center gap-2 mt-2 ml-7 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}25` }}>
            {est.icon} {est.label}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
            {cat.label}
          </span>
          {/* Avatares colaboradores */}
          {colaboradores.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/20">·</span>
              <div className="flex -space-x-1">
                {colaboradores.slice(0, 3).map((inv) => (
                  <div key={inv.id} title={`@${inv.invitado_info?.username}`}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ring-1 ring-black"
                    style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                    {getIniciales(inv.invitado_info)}
                  </div>
                ))}
                {colaboradores.length > 3 && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white/50 ring-1 ring-black"
                    style={{ background: "rgba(255,255,255,0.1)" }}>
                    +{colaboradores.length - 3}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-white/20">{colaboradores.length} colaborador{colaboradores.length > 1 ? "es" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── PÁGINA PRINCIPAL ──────────────────────────────────────
// ══════════════════════════════════════════════════════════
export default function Itinerario() {
  const [modalOpen,       setModalOpen]       = useState(false);
  const [tareaEdit,       setTareaEdit]       = useState(null);
  const [filtroFecha,     setFiltroFecha]     = useState(today());
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado,    setFiltroEstado]    = useState("todos");
  const [mounted,         setMounted]         = useState(false);
  const { logout } = useLogout();
  const qc = useQueryClient();

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const { data: meData }    = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data, isLoading } = useQuery({ queryKey: ["tareas"], queryFn: fetchTareas });

  const deleteMutation = useMutation({ mutationFn: eliminarTarea, onSuccess: () => qc.invalidateQueries(["tareas"]) });
  const toggleMutation = useMutation({ mutationFn: editarTarea,   onSuccess: () => qc.invalidateQueries(["tareas"]) });

  const tareas = data?.results || data || [];

  const tareasFiltradas = tareas
    .filter((t) => t.fecha === filtroFecha)
    .filter((t) => filtroCategoria === "todas" || t.categoria === filtroCategoria)
    .filter((t) => filtroEstado === "todos" || t.estado === filtroEstado)
    .sort((a, b) => (a.hora_inicio || "99:99").localeCompare(b.hora_inicio || "99:99"));

  const total       = tareasFiltradas.length;
  const completadas = tareasFiltradas.filter((t) => t.estado === "completada").length;
  const pendientes  = tareasFiltradas.filter((t) => t.estado === "pendiente").length;
  const progreso    = tareasFiltradas.filter((t) => t.estado === "en_progreso").length;
  const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const openCreate   = () => { setTareaEdit(null); setModalOpen(true); };
  const openEdit     = (t) => { setTareaEdit(t);   setModalOpen(true); };
  const handleDelete = (id) => { if (confirm("¿Eliminar esta tarea?")) deleteMutation.mutate(id); };
  const handleToggle = (t)  => toggleMutation.mutate({ id: t.id, estado: t.estado === "completada" ? "pendiente" : "completada" });
  const cambiarDia   = (d) => {
    const dt = new Date(filtroFecha + "T00:00:00");
    dt.setDate(dt.getDate() + d);
    setFiltroFecha(dt.toISOString().split("T")[0]);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #020617 0%, #0f0a1e 50%, #020617 100%)" }}>
      <div className="fixed top-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{ background: "radial-gradient(circle, #22d3ee, transparent 70%)" }} />
      <div className="fixed bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-8 pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className={`relative z-10 transition-all duration-600 ${mounted ? "opacity-100" : "opacity-0 translate-y-4"}`}>

        {/* ── TOPBAR ── */}
        <div className="sticky top-0 z-40 px-4 py-3"
          style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <span className="font-black text-white text-lg leading-none">iCard</span>
                <p className="text-[10px] text-white/30 leading-none mt-0.5">Itinerario</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>
                <span>+</span>
                <span className="hidden sm:inline">Nueva tarea</span>
              </button>

              {/* ── Campana ── */}
              <Notificaciones userId={meData?.id} />

              {/* ── Perfil ── */}
              <PerfilMenu onLogout={logout} />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">

          {/* Navegación fecha */}
          <div className="flex items-center gap-3">
            <button onClick={() => cambiarDia(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all">‹</button>
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-lg">📅</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
                    className="bg-transparent text-white font-bold text-sm outline-none" />
                  {isToday(filtroFecha) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }}>HOY</span>
                  )}
                </div>
                <p className="text-xs text-white/30 capitalize mt-0.5">{fmtFecha(filtroFecha)}</p>
              </div>
              {!isToday(filtroFecha) && (
                <button onClick={() => setFiltroFecha(today())} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">Ir a hoy</button>
              )}
            </div>
            <button onClick={() => cambiarDia(1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all">›</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total",       val: total,      color: "#ffffff", icon: "◈" },
              { label: "Completadas", val: completadas, color: "#4ade80", icon: "●" },
              { label: "En progreso", val: progreso,    color: "#22d3ee", icon: "◑" },
              { label: "Pendientes",  val: pendientes,  color: "#fbbf24", icon: "○" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-2xl font-black" style={{ color: s.color }}>{s.val}</span>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest leading-none">{s.label}</div>
                  <div className="text-sm mt-0.5" style={{ color: s.color }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Progreso */}
          {total > 0 && (
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/40">Progreso del día</span>
                  <span className="font-bold" style={{ color: pct === 100 ? "#4ade80" : "#22d3ee" }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg,#4ade80,#22d3ee)" : "linear-gradient(90deg,#22d3ee,#7c3aed)" }} />
                </div>
              </div>
              {pct === 100 && <span className="text-2xl">🎉</span>}
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-white/30 uppercase tracking-widest w-16 flex-shrink-0">Estado</span>
              {[
                { val: "todos",       label: "Todos" },
                { val: "pendiente",   label: "○ Pendiente" },
                { val: "en_progreso", label: "◑ En progreso" },
                { val: "completada",  label: "● Completada" },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setFiltroEstado(val)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={filtroEstado === val
                    ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                    : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 uppercase tracking-widest w-16 flex-shrink-0">Categoría</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[{ val: "todas", label: "Todas", icon: "◈" }, ...Object.entries(CATS).map(([v, c]) => ({ val: v, label: c.label, icon: c.icon }))].map(({ val, label, icon }) => (
                  <button key={val} onClick={() => setFiltroCategoria(val)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                    style={filtroCategoria === val
                      ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                      : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tareas */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                <p className="text-xs text-white/20">Cargando tareas...</p>
              </div>
            </div>
          ) : tareasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-3xl gap-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>📭</div>
              <div className="text-center">
                <p className="text-white/40 font-semibold text-sm">Sin tareas para este día</p>
                <p className="text-white/20 text-xs mt-1">Agrega actividades para organizar tu jornada</p>
              </div>
              <button onClick={openCreate}
                className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#22d3ee,#7c3aed)" }}>
                + Crear primera tarea
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tareasFiltradas.map((tarea) => (
                <TareaCard key={tarea.id} tarea={tarea}
                  onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <TareaModal
          onClose={() => { setModalOpen(false); setTareaEdit(null); }}
          tareaEdit={tareaEdit}
        />
      )}
    </div>
  );
}
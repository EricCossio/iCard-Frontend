import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema } from "../schemas/authSchema";
import { useLogin, useRegister } from "../hooks/useAuth";

/* ─── Campo con label flotante ─── */
const FloatingInput = ({ label, type = "text", error, registration, icon }) => {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="relative group">
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-300 overflow-hidden
          ${
            error
              ? "border-red-500/60 bg-red-500/5"
              : focused
                ? "border-cyan-400/60 bg-white/5 shadow-lg shadow-cyan-400/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
          }`}
      >
        <span
          className={`pl-4 text-base transition-colors duration-300 select-none ${focused ? "opacity-80" : "opacity-20"}`}
        >
          {icon}
        </span>
        <div className="relative flex-1 px-3 py-4">
          <label
            className={`absolute left-0 transition-all duration-200 pointer-events-none font-medium
              ${
                focused || hasValue
                  ? "text-[10px] top-1 tracking-widest uppercase text-cyan-400/80"
                  : "text-sm top-1/2 -translate-y-1/2 text-white/30"
              }`}
          >
            {label}
          </label>
          <input
            type={type}
            {...registration}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              setHasValue(e.target.value.length > 0);
            }}
            onChange={(e) => {
              registration.onChange(e);
              setHasValue(e.target.value.length > 0);
            }}
            className="w-full bg-transparent text-white text-sm outline-none pt-3 pb-0"
            autoComplete="off"
          />
        </div>
        <div
          className={`absolute bottom-0 left-0 h-[2px] transition-all duration-300 ${
            focused ? "w-full opacity-100" : "w-0 opacity-0"
          }`}
          style={{ background: "linear-gradient(90deg, #22d3ee, #7c3aed)" }}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 pl-1">
          <span>⚠</span> {error.message}
        </p>
      )}
    </div>
  );
};

/* ─── Login Form ─── */
const LoginForm = ({ onSwitch }) => {
  const { mutate: login, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(login)} className="flex flex-col gap-4">
      <FloatingInput
        label="Usuario"
        icon="👤"
        registration={register("username")}
        error={errors.username}
      />
      <FloatingInput
        label="Contraseña"
        type="password"
        icon="🔑"
        registration={register("password")}
        error={errors.password}
      />

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">
            ⚠ Credenciales incorrectas. Intenta de nuevo.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="relative mt-2 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed text-white"
        style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}
      >
        {isPending ? "Verificando..." : "Iniciar Sesión"}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
      </button>

      <p className="text-center text-white/30 text-sm mt-1">
        ¿Sin cuenta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors underline underline-offset-2"
        >
          Regístrate aquí
        </button>
      </p>
    </form>
  );
};

/* ─── Register Form ─── */
const RegisterForm = ({ onSwitch }) => {
  const { mutate: register_, isPending, error } = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  return (
    <form onSubmit={handleSubmit(register_)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FloatingInput
          label="Nombre"
          icon="✦"
          registration={register("first_name")}
          error={errors.first_name}
        />
        <FloatingInput
          label="Apellido"
          icon="✦"
          registration={register("last_name")}
          error={errors.last_name}
        />
      </div>
      <FloatingInput
        label="Usuario"
        icon="@"
        registration={register("username")}
        error={errors.username}
      />
      <FloatingInput
        label="Email"
        type="email"
        icon="✉"
        registration={register("email")}
        error={errors.email}
      />
      <FloatingInput
        label="Contraseña"
        type="password"
        icon="🔒"
        registration={register("password")}
        error={errors.password}
      />
      <FloatingInput
        label="Confirmar contraseña"
        type="password"
        icon="🔒"
        registration={register("confirm_password")}
        error={errors.confirm_password}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">
            Error al registrar. Verifica los datos.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="relative mt-1 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed text-white"
        style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}
      >
        {isPending ? "Creando cuenta..." : "Crear Cuenta"}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
      </button>

      <p className="text-center text-white/30 text-sm mt-1">
        ¿Ya tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors underline underline-offset-2"
        >
          Inicia sesión
        </button>
      </p>
    </form>
  );
};

/* ─── Página principal ─── */
export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #020617 0%, #0f0a1e 50%, #020617 100%)",
      }}
    >
      {/* Orbes de fondo */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #22d3ee, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #7c3aed, transparent 70%)",
        }}
      />

      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative">
        <div
          className={`relative z-10 text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Logo */}
          <div className="relative inline-block mb-10">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto relative"
              style={{
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.3)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #22d3ee, #7c3aed)",
                }}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div
              className="absolute inset-0 rounded-3xl animate-ping opacity-10"
              style={{ border: "2px solid #22d3ee" }}
            />
          </div>

          <h1
            className="text-7xl font-black tracking-tight mb-3"
            style={{
              fontFamily: "'Trebuchet MS', sans-serif",
              background: "linear-gradient(135deg, #ffffff, #22d3ee, #7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            iCard
          </h1>
          <p className="text-white/40 text-lg mb-14 font-light tracking-wide">
            Tu día, organizado con precisión
          </p>

          {/* Features */}
          <div className="flex flex-col gap-3 w-full max-w-sm text-left">
            {[
              "Gestión de tareas de trabajo y personal",
              "Control de horarios y prioridades",
              "Acceso seguro con autenticación JWT",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee, #7c3aed)",
                  }}
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-white/40 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divisor vertical */}
      <div
        className="hidden lg:block w-px self-stretch my-16"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(34,211,238,0.3), transparent)",
        }}
      />

      {/* ── Panel derecho ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div
          className={`w-full max-w-md transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #7c3aed)",
              }}
            >
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white">iCard</h1>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white mb-1">
                {isLogin ? "Bienvenido de vuelta 👋" : "Crear cuenta nueva ✨"}
              </h2>
              <p className="text-white/30 text-sm">
                {isLogin
                  ? "Ingresa tus credenciales para continuar"
                  : "Completa el formulario para comenzar"}
              </p>
            </div>

            {isLogin ? (
              <LoginForm onSwitch={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onSwitch={() => setIsLogin(true)} />
            )}
          </div>

          <p className="text-center text-white/15 text-xs mt-6 tracking-wide">
            iCard © 2026 — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { setStoredToken } from "@/lib/client-auth";
import { BrandMark } from "@/components/BrandMark";
import { ParticleField } from "@/components/ParticleField";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string; token?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo ingresar.");
        return;
      }
      if (data.token) setStoredToken(data.token);
      window.location.assign("/linea");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ParticleField />
      <div className="absolute inset-0 bg-[#081018]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0906] via-[#0c0906]/80 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="hidden max-w-lg lg:block">
          <p className="text-sm tracking-[0.22em] text-[var(--gold)] uppercase">Aserradero San Cayetano S.R.L</p>
          <h1 className="mt-4 text-5xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
            Madera, pagos y caja semanal.
          </h1>
          <p className="mt-4 text-lg text-stone-200">Panel de tesorería de la planta.</p>
        </div>
        <form onSubmit={onSubmit} className="fade-up ml-auto w-full max-w-md rounded-[28px] border border-white/10 bg-[#101826]/88 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark size="md" />
            <div>
              <p className="text-sm font-semibold text-white">Aserradero San Cayetano S.R.L</p>
              <p className="text-xs tracking-[0.14em] text-[var(--gold)] uppercase">Inicio de sesión</p>
            </div>
          </div>
          <h2 className="text-2xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
            Entrar al panel
          </h2>
          <label className="mt-6 block text-sm text-slate-300">
            Usuario
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
              autoComplete="username"
              required
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-[var(--gold)] px-4 py-3 font-semibold text-[#1a1408] disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}

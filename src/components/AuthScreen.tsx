"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { fetchCurrentUser, setStoredToken } from "@/lib/client-auth";
import { BrandMark } from "@/components/BrandMark";
import { ParticleField } from "@/components/ParticleField";

type Mode = "login" | "register";

export function AuthScreen({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(mode === "login" ? "admin@tesoreria.com" : "");
  const [password, setPassword] = useState(mode === "login" ? "tesoreria2026" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchCurrentUser().then((user) => {
      if (user) window.location.replace("/panel");
    });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: string; token?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo continuar.");
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <ParticleField />
        <div className="absolute inset-0 bg-gradient-to-t from-[#081018] via-[#081018]/70 to-[#081018]/30" />
        <div className="absolute right-0 bottom-0 left-0 p-12">
          <p className="text-sm tracking-[0.2em] text-[var(--gold)] uppercase">Caja semanal</p>
          <h1
            className="mt-3 max-w-md text-4xl text-white"
            style={{ fontFamily: "var(--font-display), Fraunces, serif" }}
          >
            Lo que no se paga el jueves, viaja al viernes siguiente.
          </h1>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="text-sm tracking-[0.16em] text-[var(--gold)] uppercase">Tesorería</span>
          </Link>
          <h2 className="text-3xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
            {mode === "login" ? "Ingresar al panel" : "Crear usuario"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "login"
              ? "Calendario compartido para todo el equipo de tesorería."
              : "El primer usuario queda como administrador. El resto opera la carga."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "register" ? (
              <label className="block text-sm text-slate-300">
                Nombre
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
                  required
                />
              </label>
            ) : null}
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
                required
              />
            </label>
            <label className="block text-sm text-slate-300">
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
                required
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[var(--gold)] px-4 py-3 font-semibold text-[#1a1408] disabled:opacity-60"
            >
              {loading ? "Ingresando..." : mode === "login" ? "Entrar" : "Registrarme"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            {mode === "login" ? (
              <>
                ¿No tenés usuario?{" "}
                <Link href="/registro" className="text-[var(--gold-2)]">
                  Crear cuenta
                </Link>
              </>
            ) : (
              <>
                ¿Ya tenés acceso?{" "}
                <Link href="/login" className="text-[var(--gold-2)]">
                  Ingresar
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

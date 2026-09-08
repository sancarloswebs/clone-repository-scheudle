"use client";

import { useEffect, useState } from "react";
import type { TreasuryLine } from "@/lib/categories";
import { BrandMark } from "@/components/BrandMark";
import { ParticleField } from "@/components/ParticleField";

const LINE_KEY = "sancayetano_line";

export function LineSelector() {
  const [loading, setLoading] = useState(false);
  function choose(line: TreasuryLine) {
    setLoading(true);
    window.localStorage.setItem(LINE_KEY, String(line));
    window.location.assign(`/panel?line=${line}&vista=tabla`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[#081018]" />
      <ParticleField />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-12">
        <section className="fade-up w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#101826]/90 p-7 text-center shadow-2xl backdrop-blur-md sm:p-10">
          <BrandMark size="lg" />
          <p className="mt-6 text-xs tracking-[0.2em] text-[var(--gold)] uppercase">Aserradero San Cayetano S.R.L</p>
          <h1 className="mt-3 text-3xl text-white sm:text-4xl" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
            ¿Con qué línea quiere trabajar?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">Seleccioná la línea para cargar y consultar sus movimientos. Los datos de cada línea quedan separados.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button type="button" disabled={loading} onClick={() => choose(1)} className="hover-lift rounded-[24px] border border-[var(--gold)]/30 bg-white/5 p-7 text-left transition hover:bg-white/10 disabled:opacity-60">
              <span className="text-xs tracking-[0.18em] text-[var(--gold)] uppercase">Línea 1</span>
              <strong className="mt-2 block text-2xl text-white">Tesorería actual</strong>
              <span className="mt-2 block text-sm text-slate-400">Mantiene todos los movimientos existentes y suma cobros por transferencia y eCheq.</span>
            </button>
            <button type="button" disabled={loading} onClick={() => choose(2)} className="hover-lift rounded-[24px] border border-teal-300/20 bg-white/5 p-7 text-left transition hover:bg-white/10 disabled:opacity-60">
              <span className="text-xs tracking-[0.18em] text-teal-200 uppercase">Línea 2</span>
              <strong className="mt-2 block text-2xl text-white">Nueva tesorería</strong>
              <span className="mt-2 block text-sm text-slate-400">Pagos y cobros en efectivo, dólares y cheques físicos.</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

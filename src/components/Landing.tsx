import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ParticleField } from "@/components/ParticleField";

const features = [
  {
    title: "Semana viernes a jueves",
    text: "La tesorería cierra el jueves y se paga el viernes. Cada fila del calendario es una semana operativa real.",
  },
  {
    title: "Semáforo de caja",
    text: "Verde bajo $15M, amarillo entre $15M y $30M, rojo por encima de $30M. El tope semanal muestra si te pasaste y por cuánto.",
  },
  {
    title: "Pendientes que arrastran",
    text: "Lo no pagado se suma como pendiente en la semana siguiente, y así sucesivamente, hasta marcarlo como pagado.",
  },
  {
    title: "Dos vistas + histórico",
    text: "Tabla semanal tipo Excel y calendario mensual. Importás CSV/Excel o cargás a mano. Queda guardado para todo el equipo.",
  },
];

export function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ParticleField />
      <div className="absolute inset-0 bg-gradient-to-b from-[#081018]/40 via-[#081018]/78 to-[#081018]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark size="md" />
            <div>
              <p className="text-sm tracking-[0.18em] text-[var(--gold)] uppercase">Tesorería</p>
              <p className="text-sm text-slate-300">Calendario de pagos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm text-slate-200 hover:text-white">
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] shadow-[0_10px_30px_rgba(212,175,110,0.25)]"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        <section className="mt-16 grid items-end gap-10 lg:mt-24 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-medium tracking-[0.2em] text-[var(--teal)] uppercase">
              Semana operativa · Vie → Jue
            </p>
            <h1
              className="mt-4 max-w-3xl text-4xl leading-[1.05] font-medium text-white sm:text-6xl"
              style={{ fontFamily: "var(--font-display), Fraunces, serif" }}
            >
              El pulso semanal de la caja, con semáforo y arrastre de impagos.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Cargá pagos de tarjeta, cheques, ARCA, sueldos y préstamos. El sistema totaliza la semana,
              la compara contra el tope y pinta de verde, amarillo o rojo. Lo pendiente no desaparece:
              viaja a la semana siguiente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[var(--teal)] px-6 py-3 text-sm font-semibold text-[#06231b]"
              >
                Probar el panel
              </Link>
              <Link
                href="/registro"
                className="rounded-full border border-white/15 px-6 py-3 text-sm text-white"
              >
                Sumar un usuario
              </Link>
            </div>
            <div className="mt-8 rounded-2xl border border-[var(--line)] bg-black/30 p-4 text-sm text-slate-300">
              <p className="font-medium text-[var(--gold-2)]">Acceso de demostración</p>
              <p className="mt-1">admin@tesoreria.com · tesoreria2026</p>
              <p>operaciones@tesoreria.com · tesoreria2026</p>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[var(--line)] bg-[#101826]/80 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">Semana tipo</p>
            <p className="mt-2 text-lg text-white">Vie 07/08 — Jue 13/08</p>
            <p className="mt-6 text-3xl font-semibold text-white">$21.236.406</p>
            <p className="mt-1 text-sm text-amber-300">Amarillo · te pasaste del tope por $1.236.406</p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-indigo-200">
                <span>Tarjeta de Crédito</span>
                <span>$6.071.406</span>
              </div>
              <div className="flex justify-between text-cyan-200">
                <span>Cheques Electrónicos</span>
                <span>$9.165.000</span>
              </div>
              <div className="flex justify-between text-amber-200">
                <span>Planes ARCA</span>
                <span>$5.500.000</span>
              </div>
              <div className="flex justify-between text-sky-200">
                <span>Cheques Físicos</span>
                <span>$500.000</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-16 mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-white/8 bg-white/4 p-5 backdrop-blur-sm"
            >
              <h2 className="text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{feature.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

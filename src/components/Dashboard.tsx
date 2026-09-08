"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsModal } from "@/components/AppModals";
import { BrandMark } from "@/components/BrandMark";
import { ParticleField } from "@/components/ParticleField";
import { MonthCalendar } from "@/components/MonthCalendar";
import { PaymentModal } from "@/components/PaymentModal";
import { ChecksTable } from "@/components/ChecksTable";
import { PeriodSummaries } from "@/components/PeriodSummaries";
import { WeeklyTable } from "@/components/WeeklyTable";
import { Line2WeeklyTable } from "@/components/Line2WeeklyTable";
import { CATEGORY_META, categoriesForLine, isCheckCategory, isIncomeCategory, isLine1CollectedCategory, type PaymentCategory, type TreasuryLine } from "@/lib/categories";
import { MONTH_NAMES, addDaysISO, formatDisplayDate, formatShortDate, parseISODate, shiftMonth, startOfPaymentWeek, todayISO, toISODate, weekContainsToday } from "@/lib/dates";
import { apiFetch, clearStoredToken } from "@/lib/client-auth";
import { formatARS, toNumber } from "@/lib/money";
import { buildWeekSummaries } from "@/lib/weeks";
import type { AppSettings, PaymentDTO, PublicUser, WeekSummary } from "@/lib/types";

type ViewMode = "semana" | "calendario";

export function Dashboard({ user, initialView = "semana", line = 1 }: { user: PublicUser; initialView?: ViewMode; line?: TreasuryLine }) {
  const now = new Date();
  const isAdmin = user.role === "admin";
  const lineCategories = categoriesForLine(line);
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [view, setView] = useState<ViewMode>(line === 2 ? "semana" : initialView);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO());
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(toISODate(startOfPaymentWeek(now)));
  const [selectedWeekStarts, setSelectedWeekStarts] = useState<string[]>([]);
  const [editing, setEditing] = useState<PaymentDTO | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | PaymentCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "pagado">("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  function changeView(next: ViewMode) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("vista", next === "calendario" ? "calendario" : "tabla");
    window.history.replaceState({}, "", url);
  }

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch(`/api/weeks?year=${year}&month=${monthIndex + 1}&line=${line}&t=${Date.now()}`);
      const data = (await response.json()) as { payments?: PaymentDTO[]; settings?: AppSettings; error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "No se pudo cargar el calendario.");
        return;
      }
      setPayments(data.payments ?? []);
      setSettings(data.settings ?? null);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex, line]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sancayetano_view");
      if (!raw) return;
      const saved = JSON.parse(raw) as { year?: number; monthIndex?: number; view?: ViewMode };
      if (typeof saved.year === "number") setYear(saved.year);
      if (typeof saved.monthIndex === "number") setMonthIndex(saved.monthIndex);
      if (line === 1 && (saved.view === "semana" || saved.view === "calendario")) setView(saved.view);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowPayment(false);
        setShowSettings(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visiblePayments = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return payments.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [item.beneficiary, item.description, item.category, item.notes, item.status, item.date, item.amount]
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(q);
    });
  }, [payments, categoryFilter, statusFilter, query]);

  const weeks = useMemo<WeekSummary[]>(() => {
    if (!settings) return [];
    return buildWeekSummaries(visiblePayments, year, monthIndex, settings);
  }, [visiblePayments, year, monthIndex, settings]);

  const checkWeeks = useMemo<WeekSummary[]>(() => {
    if (!settings) return [];
    const checks = visiblePayments.filter((item) => isCheckCategory(item.category));
    return buildWeekSummaries(checks, year, monthIndex, { ...settings, weeklyCap: settings.checksWeeklyCap });
  }, [visiblePayments, year, monthIndex, settings]);

  const selectedWeek =
    weeks.find((week) => week.startISO === selectedWeekStart) ??
    weeks.find((week) => weekContainsToday(week.startISO, week.endISO)) ??
    weeks[0] ??
    null;

  const selectedWeekSummaries = useMemo(
    () => weeks.filter((week) => selectedWeekStarts.includes(week.startISO)).sort((a, b) => a.weekNo - b.weekNo),
    [weeks, selectedWeekStarts],
  );
  const selectedWeekPayments = useMemo(
    () => visiblePayments.filter((item) => selectedWeekSummaries.some((week) => item.date >= week.startISO && item.date <= week.endISO)),
    [visiblePayments, selectedWeekSummaries],
  );
  const last15 = useMemo(() => {
    const to = todayISO();
    const from = addDaysISO(to, -14);
    return { from, to, payments: visiblePayments.filter((item) => item.date >= from && item.date <= to) };
  }, [visiblePayments]);
  const last30 = useMemo(() => {
    const to = todayISO();
    const from = addDaysISO(to, -29);
    return { from, to, payments: visiblePayments.filter((item) => item.date >= from && item.date <= to) };
  }, [visiblePayments]);

  const monthOwn = weeks.reduce((sum, week) => sum + week.ownTotal, 0);
  const monthPending = payments
    .filter((item) => item.status === "pendiente" && item.date.slice(0, 7) === `${year}-${String(monthIndex + 1).padStart(2, "0")}`)
    .reduce((sum, item) => sum + (item.category.startsWith("Cobro") || item.category.startsWith("Cobros") ? toNumber(item.amount) : -toNumber(item.amount)), 0);
  const redWeeks = weeks.filter((week) => week.traffic === "red").length;
  const periodExpenses = Math.abs(weeks.reduce((sum, week) => sum + week.ownExpenseTotal, 0));
  const periodIncome = Math.abs(weeks.reduce((sum, week) => sum + week.ownIncomeTotal, 0));

  function goMonth(delta: number) {
    const next = shiftMonth(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
    setSelectedWeekStarts([]);
  }

  function goLine2Week(delta: number) {
    const currentStart = selectedWeek?.startISO ?? toISODate(startOfPaymentWeek(new Date()));
    const nextStart = addDaysISO(currentStart, delta * 7);
    const nextDate = parseISODate(nextStart);
    setYear(nextDate.getFullYear());
    setMonthIndex(nextDate.getMonth());
    setSelectedWeekStart(nextStart);
    setSelectedWeekStarts([]);
  }

  function goToday() {
    const current = new Date();
    setYear(current.getFullYear());
    setMonthIndex(current.getMonth());
    setSelectedDate(todayISO());
    setSelectedWeekStart(toISODate(startOfPaymentWeek(current)));
  }

  async function togglePaid(payment: PaymentDTO) {
    if (!isAdmin) return;
    await apiFetch(`/api/payments/${payment.id}?line=${line}`, {
      method: "PATCH",
      body: JSON.stringify({ status: payment.status === "pagado" ? "pendiente" : "pagado", line }),
    });
    await load();
  }

  async function deletePayment(payment: PaymentDTO) {
    if (!isAdmin) return;
    if (!confirm(`¿Borrar el pago de ${payment.beneficiary || payment.category}?`)) return;
    const response = await apiFetch(`/api/payments/${payment.id}?line=${line}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo borrar el pago.");
      return;
    }
    setNotice("Pago borrado.");
    await load();
  }

  async function refreshAll() {
    setLoading(true);
    setNotice("");
    await load();
    setNotice("Tabla actualizada.");
  }

  async function saveAll() {
    setError("");
    const response = await apiFetch(`/api/save?line=${line}`, { method: "POST" });
    if (!response.ok) {
      setError("No se pudo guardar.");
      return;
    }
    window.localStorage.setItem("sancayetano_view", JSON.stringify({ year, monthIndex, view }));
    setNotice("Tabla y calendario guardados. Quedan igual al volver a entrar.");
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearStoredToken();
    window.location.assign("/login");
  }

  function openNew(date?: string) {
    if (!isAdmin) return;
    setEditing(null);
    if (date) setSelectedDate(date);
    setShowPayment(true);
  }

  async function clearMonth() {
    if (!isAdmin) return;
    const monthName = MONTH_NAMES[monthIndex];
    const confirmed = window.confirm(
      `¿Realmente quieres borrar los datos cargados de este mes?\n\nSe van a eliminar todos los pagos de ${monthName} ${year}.`,
    );
    if (!confirmed) return;
    const clave = window.prompt("Escribí la clave para confirmar:");
if (clave !== "limpiar") {
  setNotice("Clave incorrecta. No se borró nada.");
  return;
}
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/api/payments?year=${year}&month=${monthIndex + 1}&line=${line}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string; deleted?: number };
      if (!response.ok) {
        setError(data.error ?? "No se pudo limpiar la tabla.");
        return;
      }
      setSelectedWeekStarts([]);
      await load();
      setNotice(`Se borraron ${data.deleted ?? 0} pagos de ${monthName} ${year}.`);
    } finally {
      setLoading(false);
    }
  }

  if (!settings) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <p className="text-slate-400">{loading ? "Cargando tesorería..." : error || "Sin datos."}</p>
          {!loading ? (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void load();
              }}
              className="mt-4 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408]"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#081018]/90 backdrop-blur-xl">
        <div className="flex w-full flex-wrap items-center gap-3 px-3 py-3 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
            <BrandMark size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Aserradero San Cayetano S.R.L</p>
              <p className="text-[11px] tracking-[0.14em] text-[var(--gold)] uppercase">Tesorería · Línea {line} · Vie → Jue</p>
            </div>
          </div>
          <div className="ml-auto hidden flex-wrap items-center gap-2 lg:flex">
            <button onClick={goToday} className="rounded-full bg-white/6 px-3 py-2 text-sm text-white">Hoy</button>
            {line === 2 && view === "semana" ? <button onClick={() => goLine2Week(-1)} className="rounded-full bg-white/6 px-3 py-2 text-white">‹</button> : <button onClick={() => goMonth(-1)} className="rounded-full bg-white/6 px-3 py-2 text-white">‹</button>}
            {line === 2 && view === "semana" ? <button onClick={() => goLine2Week(1)} className="rounded-full bg-white/6 px-3 py-2 text-white">›</button> : <button onClick={() => goMonth(1)} className="rounded-full bg-white/6 px-3 py-2 text-white">›</button>}
            <h1 className="px-2 text-lg text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
              {line === 2 && view === "semana" && selectedWeek ? `Semana ${selectedWeek.weekNo} · ${formatShortDate(selectedWeek.startISO)} – ${formatShortDate(selectedWeek.endISO)}` : `${year} ${MONTH_NAMES[monthIndex]}`}
            </h1>
            <div className="rounded-full bg-white/8 p-1">
              <button onClick={() => changeView("semana")} className={`rounded-full px-3 py-1.5 text-sm ${view === "semana" ? "bg-[var(--gold)] text-[#1a1408]" : "text-slate-300"}`}>Tabla</button>
              <button onClick={() => changeView("calendario")} className={`rounded-full px-3 py-1.5 text-sm ${view === "calendario" ? "bg-[var(--gold)] text-[#1a1408]" : "text-slate-300"}`}>Calendario</button>
            </div>
            {isAdmin ? <button onClick={() => openNew(selectedDate ?? todayISO())} className="rounded-full bg-[var(--teal)] px-4 py-2 text-sm font-semibold text-[#06231b]">Nuevo evento</button> : null}
            {isAdmin && line === 1 ? <button onClick={() => setShowSettings(true)} className="rounded-full bg-white/8 px-4 py-2 text-sm text-white">Tope</button> : null}
            {isAdmin ? <button onClick={() => void saveAll()} className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408]">Guardar</button> : null}
            <button onClick={() => void refreshAll()} className="rounded-full bg-white/8 px-4 py-2 text-sm text-white">Actualizar tabla</button>
            {isAdmin ? <button onClick={() => void clearMonth()} className="rounded-full bg-rose-400/15 px-4 py-2 text-sm text-rose-200">Limpiar mes</button> : null}
            <button onClick={() => window.location.assign("/linea")} className="rounded-full bg-white/8 px-3 py-2 text-sm text-slate-300">Cambiar línea</button>
            <button onClick={() => void logout()} className="rounded-full px-3 py-2 text-sm text-slate-400">Salir</button>
          </div>
        </div>
        <div className="space-y-3 px-3 pb-3 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <button onClick={goToday} className="rounded-full bg-white/6 px-3 py-2 text-sm text-white">Hoy</button>
            <div className="flex items-center gap-1">
              {line === 2 && view === "semana" ? <button onClick={() => goLine2Week(-1)} className="rounded-full bg-white/6 px-3 py-2 text-white">‹</button> : <button onClick={() => goMonth(-1)} className="rounded-full bg-white/6 px-3 py-2 text-white">‹</button>}
              {line === 2 && view === "semana" ? <button onClick={() => goLine2Week(1)} className="rounded-full bg-white/6 px-3 py-2 text-white">›</button> : <button onClick={() => goMonth(1)} className="rounded-full bg-white/6 px-3 py-2 text-white">›</button>}
            </div>
          </div>
          <h1 className="mt-3 text-xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
            {line === 2 && view === "semana" && selectedWeek ? `Semana ${selectedWeek.weekNo} · ${formatShortDate(selectedWeek.startISO)} – ${formatShortDate(selectedWeek.endISO)}` : `${year} ${MONTH_NAMES[monthIndex]}`}
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => changeView("semana")} className={`rounded-full px-3 py-2 text-sm ${view === "semana" ? "bg-[var(--gold)] text-[#1a1408]" : "bg-white/8 text-white"}`}>Tabla</button>
            <button onClick={() => changeView("calendario")} className={`rounded-full px-3 py-2 text-sm ${view === "calendario" ? "bg-[var(--gold)] text-[#1a1408]" : "bg-white/8 text-white"}`}>Calendario</button>
            {isAdmin ? <button onClick={() => openNew(selectedDate ?? todayISO())} className="col-span-2 rounded-full bg-[var(--teal)] px-4 py-2 text-sm font-semibold text-[#06231b]">Nuevo evento</button> : null}
            {isAdmin && line === 1 ? <button onClick={() => setShowSettings(true)} className="rounded-full bg-white/8 px-3 py-2 text-sm text-white">Tope</button> : null}
            {isAdmin ? <button onClick={() => void saveAll()} className="rounded-full bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-[#1a1408]">Guardar</button> : null}
            <button onClick={() => void refreshAll()} className="rounded-full bg-white/8 px-3 py-2 text-sm text-white">Actualizar tabla</button>
            {isAdmin ? <button onClick={() => void clearMonth()} className="rounded-full bg-rose-400/15 px-3 py-2 text-sm text-rose-200">Limpiar mes</button> : null}
            <button onClick={() => window.location.assign("/linea")} className="col-span-2 rounded-full bg-white/8 px-3 py-2 text-sm text-slate-300">Cambiar línea</button>
            <button onClick={() => void logout()} className="col-span-2 rounded-full px-3 py-2 text-sm text-slate-400">Salir</button>
          </div>
        </div>
      </header>

      <div className="relative z-10 w-full px-4 py-6 lg:px-6">
        {line === 1 ? (
          <section className="grid gap-3 md:grid-cols-3">
            <Stat label="Total del mes" value={formatARS(Math.abs(monthOwn))} hint="Resultado neto de movimientos" />
            <Stat label="Pendiente del mes" value={formatARS(Math.abs(monthPending))} hint={`${payments.filter((item) => item.status === "pendiente").length} eventos abiertos`} />
            <Stat label="Tope semanal" value={formatARS(settings.weeklyCap)} hint={redWeeks ? `${redWeeks} semana(s) en rojo` : "Sin semanas críticas"} />
          </section>
        ) : (
          <section className="grid gap-3 md:grid-cols-2">
            <Stat label="Total gastos" value={formatARS(periodExpenses)} hint="Movimientos de egreso" />
            <Stat label="Total ingresos" value={formatARS(periodIncome)} hint="Movimientos de ingreso" />
          </section>
        )}

        <section className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar beneficiario o concepto" className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none sm:max-w-xs" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)} className="w-full rounded-full border border-white/10 bg-[#101826] px-3 py-2 text-sm text-white sm:w-auto">
            <option value="all">Todos los rubros</option>
            {lineCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="w-full rounded-full border border-white/10 bg-[#101826] px-3 py-2 text-sm text-white sm:w-auto">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">{line === 2 ? "Pagados / cobrados" : "Pagados"}</option>
          </select>
        </section>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-200">{notice}</p> : null}

        <section className={`mt-5 grid items-start gap-5 fade-up ${view === "calendario" ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"}`}>
          {view === "semana" ? (
            line === 2 ? (
              <Line2WeeklyTable
                week={selectedWeek}
                readOnly={!isAdmin}
                onAddDay={(iso) => { setSelectedDate(iso); setSelectedWeekStart(toISODate(startOfPaymentWeek(parseISODate(iso)))); openNew(iso); }}
                onEditPayment={(payment) => { if (!isAdmin) return; setEditing(payment); setShowPayment(true); }}
                onDeletePayment={(payment) => void deletePayment(payment)}
              />
            ) : (
            <WeeklyTable
              weeks={weeks}
              readOnly={!isAdmin}
              selectedWeekStarts={selectedWeekStarts}
              onToggleWeek={(startISO) => {
                setSelectedWeekStart(startISO);
                setSelectedWeekStarts((current) => current.includes(startISO) ? current.filter((item) => item !== startISO) : [...current, startISO]);
              }}
              onAddDay={(iso) => {
                setSelectedDate(iso);
                setSelectedWeekStart(toISODate(startOfPaymentWeek(parseISODate(iso))));
                openNew(iso);
              }}
              onEditPayment={(payment) => {
                if (!isAdmin) return;
                setEditing(payment);
                setShowPayment(true);
              }}
              onDeletePayment={(payment) => void deletePayment(payment)}
            />
            )
          ) : (
            <MonthCalendar
              year={year}
              monthIndex={monthIndex}
              payments={visiblePayments}
              weeks={weeks}
              selectedDate={selectedDate}
              onSelectDate={(iso) => {
                setSelectedDate(iso);
                setSelectedWeekStart(toISODate(startOfPaymentWeek(parseISODate(iso))));
                openNew(iso);
              }}
              onOpenPayment={(payment) => {
                if (!isAdmin) return;
                setEditing(payment);
                setShowPayment(true);
              }}
            />
          )}

          {view === "semana" && line === 1 ? (
            <ChecksTable
              weeks={checkWeeks}
              cap={settings.checksWeeklyCap}
              readOnly={!isAdmin}
              onEditPayment={(payment) => {
                if (!isAdmin) return;
                setEditing(payment);
                setShowPayment(true);
              }}
              onDeletePayment={(payment) => void deletePayment(payment)}
              onSaveCap={async (value) => {
                const response = await apiFetch("/api/settings", {
                  method: "PUT",
                  body: JSON.stringify({
                    companyName: settings.companyName,
                    weeklyCap: settings.weeklyCap,
                    checksWeeklyCap: value,
                    greenMax: settings.greenMax,
                    yellowMax: settings.yellowMax,
                  }),
                });
                if (!response.ok) {
                  setError("No se pudo guardar el tope de cheques.");
                  return;
                }
                setNotice("Tope de cheques actualizado.");
                await load();
              }}
            />
          ) : null}

          <aside className="space-y-4">
            {line === 1 ? <div className="rounded-[28px] border border-[var(--line)] bg-[#101826]/85 p-5">
              <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">Semáforo</p>
              <div className="mt-3 space-y-2 text-sm">
                <Legend color="#34d399" label={`Verde · menos de ${formatARS(settings.greenMax, { compact: true })}`} />
                <Legend color="#fbbf24" label={`Amarillo · hasta ${formatARS(settings.yellowMax, { compact: true })}`} />
                <Legend color="#fb7185" label={`Rojo · más de ${formatARS(settings.yellowMax, { compact: true })}`} />
                <Legend color="#f9a8d4" label="Rosado · feriado nacional" />
              </div>
            </div> : null}
            {selectedWeek && line === 1 ? (
              <WeekPanel
                week={selectedWeek}
                cap={toNumber(settings.weeklyCap)}
                user={user}
                readOnly={!isAdmin}
                onToggle={togglePaid}
                onEdit={(payment) => {
                  if (!isAdmin) return;
                  setEditing(payment);
                  setShowPayment(true);
                }}
                onDelete={(payment) => void deletePayment(payment)}
                onAdd={() => openNew(selectedDate ?? selectedWeek.startISO)}
              />
            ) : null}
            {selectedWeek && line === 2 ? (
              <div className="rounded-[28px] border border-[var(--line)] bg-[#101826]/90 p-5">
                <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">Detalle de semana</p>
                <h2 className="mt-1 text-xl text-white">Semana {selectedWeek.weekNo}</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="Gastos" value={formatARS(Math.abs(selectedWeek.ownExpenseTotal))} hint="Pagos" />
                  <Stat label="Ingresos" value={formatARS(Math.abs(selectedWeek.ownIncomeTotal))} hint="Cobros / depósitos" />
                </div>
                <div className="mt-5 space-y-2">
                  {selectedWeek.days.flatMap((day) => day.payments).map((item) => (
                    <button key={item.id} type="button" onClick={() => { if (isAdmin) { setEditing(item); setShowPayment(true); } }} className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left">
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{item.beneficiary || item.category}</span><span className="block truncate text-xs text-slate-500">{item.category}</span></span>
                      <span className={isIncomeCategory(item.category) ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{formatARS(Math.abs(Number(item.amount)), { compact: true })}</span>
                    </button>
                  ))}
                  {selectedWeek.days.every((day) => day.payments.length === 0) ? <p className="text-sm text-slate-500">Sin movimientos en esta semana.</p> : null}
                </div>
              </div>
            ) : null}
          </aside>
        </section>

        {line === 1 ? (
          <PeriodSummaries
            selectedWeeks={{ weeks: selectedWeekSummaries, payments: selectedWeekPayments }}
            last15={last15}
            last30={last30}
          />
        ) : null}
      </div>

      <PaymentModal
        open={showPayment && isAdmin}
        payment={editing}
        initialDate={selectedDate ?? todayISO()}
        canDelete={Boolean(editing && isAdmin)}
        line={line}
        onClose={() => {
          setShowPayment(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />
      {isAdmin && line === 1 ? (
        <SettingsModal open={showSettings} user={user} settings={settings} onClose={() => setShowSettings(false)} onSaved={() => void load()} />
      ) : null}
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="fade-up rounded-[24px] border border-[var(--line)] bg-[#101826]/80 p-4">
      <p className="text-xs tracking-[0.14em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <span className="dot-pulse h-2.5 w-2.5 rounded-full" style={{ background: color, ["--dot" as string]: color }} />
      {label}
    </div>
  );
}

function WeekPanel({
  week,
  cap,
  user,
  readOnly,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  week: WeekSummary;
  cap: number;
  user: PublicUser;
  readOnly: boolean;
  onToggle: (payment: PaymentDTO) => void;
  onEdit: (payment: PaymentDTO) => void;
  onDelete: (payment: PaymentDTO) => void;
  onAdd: () => void;
}) {
  const used = Math.min(100, cap > 0 ? (week.effectiveTotal / cap) * 100 : 0);
  return (
    <div className={`traffic-${week.traffic} rounded-[28px] border border-[var(--line)] bg-[#101826]/90 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">Detalle de semana</p>
          <h2 className="mt-1 text-xl text-white">Semana {week.weekNo}</h2>
        </div>
        {!readOnly ? <button onClick={onAdd} className="text-sm text-[var(--teal)]">+ Pago</button> : null}
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{formatARS(Math.abs(week.effectiveTotal))}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--tone)" }}>
        {week.vsCap > 0 ? `Te pasaste del tope por ${formatARS(week.vsCap)}` : `Holgura de ${formatARS(Math.abs(week.vsCap))} contra el tope`}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${used}%`, background: "var(--tone)" }} />
      </div>
      <div className="mt-5 space-y-2">
        {week.breakdown.map((item) => (
          <div key={item.category} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <i className="dot-pulse h-2 w-2 rounded-full" style={{ background: CATEGORY_META[item.category].color, ["--dot" as string]: CATEGORY_META[item.category].color }} />
              {item.category}
            </span>
            <span className="text-white">{formatARS(Math.abs(item.total))}</span>
          </div>
        ))}
      </div>
      {week.carryover.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs tracking-[0.14em] text-orange-200 uppercase">Arrastre de semanas anteriores</p>
          <div className="mt-2 space-y-2">
            {week.carryover.map((item) => (
              <PaymentRow key={item.id} payment={item} user={user} readOnly={readOnly} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-5">
        <p className="text-sm font-semibold tracking-[0.14em] text-emerald-300 uppercase">Pagos de la semana</p>
        <div className="mt-2 space-y-2">
          {week.days.flatMap((day) => day.payments).map((item) => (
            <PaymentRow key={item.id} payment={item} user={user} readOnly={readOnly} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({
  payment,
  readOnly,
  onToggle,
  onEdit,
  onDelete,
}: {
  payment: PaymentDTO;
  user: PublicUser;
  readOnly: boolean;
  onToggle: (payment: PaymentDTO) => void;
  onEdit: (payment: PaymentDTO) => void;
  onDelete: (payment: PaymentDTO) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/4 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onEdit(payment)} className="min-w-0 flex-1 text-left">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold break-words text-white">{formatARS(Math.abs(Number(payment.amount)))}</span>
            <span className={`text-[11px] font-semibold ${payment.status === "pagado" ? "status-pagado" : "status-pendiente"}`}>
              {payment.status === "pagado" && isLine1CollectedCategory(payment.category) ? "cobrado" : payment.status}
            </span>
          </p>
          <p className="mt-1 text-sm font-medium break-words text-slate-100">{payment.beneficiary || "Sin titular"}</p>
          <p className="mt-1 text-xs text-slate-400">{formatDisplayDate(payment.date)}</p>
          <p className="text-xs text-slate-400">{payment.category}</p>
        </button>
        {!readOnly ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => onToggle(payment)} className={`text-[11px] font-semibold ${payment.status === "pagado" ? "status-pagado" : "status-pendiente"}`}>
              cambiar
            </button>
            <button type="button" onClick={() => onDelete(payment)} className="text-[11px] text-rose-300">Borrar</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

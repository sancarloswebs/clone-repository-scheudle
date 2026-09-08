"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { categoriesForLine, isIncomeCategory, isLine1CollectedCategory, type PaymentCategory, type TreasuryLine } from "@/lib/categories";
import { apiFetch } from "@/lib/client-auth";
import { parseAmount } from "@/lib/money";
import type { PaymentDTO } from "@/lib/types";

type Props = { open: boolean; initialDate?: string; payment?: PaymentDTO | null; canDelete?: boolean; onClose: () => void; onSaved: () => void; line: TreasuryLine; };

export function PaymentModal({ open, initialDate, payment, canDelete, onClose, onSaved, line }: Props) {
  const [date, setDate] = useState(initialDate ?? "");
  const [amount, setAmount] = useState("");
  const [dollarAmount, setDollarAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateMode, setRateMode] = useState<"auto" | "manual">("auto");
  const [rateSource, setRateSource] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const lineCategories = useMemo(() => categoriesForLine(line), [line]);
  const [category, setCategory] = useState<PaymentCategory>(lineCategories[0]);
  const [beneficiary, setBeneficiary] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"pendiente" | "pagado">("pendiente");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDollar = category === "Pago en dólares" || category === "Cobro en dólares";

  useEffect(() => {
    if (!open) return;
    setDate(payment?.date ?? initialDate ?? "");
    setCategory(payment && lineCategories.includes(payment.category) ? payment.category : lineCategories[0]);
    setAmount(payment ? String(Number(payment.amount)) : "");
    setDollarAmount(payment?.foreignAmount ? String(Number(payment.foreignAmount)) : "");
    setExchangeRate(payment?.exchangeRate ? String(Number(payment.exchangeRate)) : "");
    setRateMode(payment?.exchangeRateSource === "manual" ? "manual" : "auto");
    setRateSource(payment?.exchangeRateSource ?? "");
    setBeneficiary(payment?.beneficiary ?? "");
    setDescription(payment?.description ?? "");
    setNotes(payment?.notes ?? "");
    setStatus(payment?.status ?? "pendiente");
    setError("");
  }, [open, payment, initialDate, lineCategories]);

  async function loadBlueRate() {
    setRateLoading(true); setError("");
    try {
      const response = await apiFetch("/api/exchange-rate");
      const data = await response.json() as { promedio?: number; error?: string };
      if (!response.ok || !data.promedio) throw new Error(data.error ?? "No se pudo obtener la cotización.");
      const rate = Number(data.promedio.toFixed(4));
      setExchangeRate(String(rate));
      setRateSource("InfoDolar");
      const usd = parseAmount(dollarAmount);
      if (usd != null) setAmount((usd * rate).toFixed(2));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo obtener la cotización."); }
    finally { setRateLoading(false); }
  }

  useEffect(() => {
    if (!open || !isDollar || rateMode !== "auto") return;
    if (payment?.exchangeRateSource === "manual") return;
    void loadBlueRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDollar, payment?.exchangeRateSource]);

  function updateUsd(value: string) {
    setDollarAmount(value);
    const usd = parseAmount(value); const rate = parseAmount(exchangeRate);
    if (usd != null && rate != null) setAmount((usd * rate).toFixed(2));
  }
  function updateRate(value: string) {
    setExchangeRate(value);
    const usd = parseAmount(dollarAmount); const rate = parseAmount(value);
    if (usd != null && rate != null) setAmount((usd * rate).toFixed(2));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount);
    const rate = isDollar ? parseAmount(exchangeRate) : null;
    const usd = isDollar ? (rateMode === "auto" ? parseAmount(dollarAmount) : (parsed != null && rate ? parsed / rate : null)) : null;
    if (!date || parsed == null || (isDollar && (usd == null || usd <= 0 || rate == null || rate <= 0))) { setError(isDollar ? "Completá fecha, dólares y cotización." : "Completá fecha e importe en pesos."); return; }
    setLoading(true); setError("");
    try {
      const payload = { date, amount: parsed, category, beneficiary, description, notes, status, line, currency: isDollar ? "USD" : "ARS", foreignAmount: usd, exchangeRate: rate, exchangeRateSource: isDollar ? (rateMode === "manual" ? "manual" : "InfoDolar") : undefined };
      const response = await apiFetch(payment ? `/api/payments/${payment.id}?line=${line}` : "/api/payments", { method: payment ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo guardar."); return; }
      onSaved(); onClose();
    } catch { setError("Error de conexión."); } finally { setLoading(false); }
  }

  async function onDelete() {
    if (!payment || !confirm("¿Eliminar este evento?")) return;
    setLoading(true);
    try { const response = await apiFetch(`/api/payments/${payment.id}?line=${line}`, { method: "DELETE" }); const data = await response.json() as { error?: string }; if (!response.ok) { setError(data.error ?? "No se pudo eliminar."); return; } onSaved(); onClose(); } finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="app-scroll max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-[28px] border border-[var(--line)] bg-[#101826] p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
        <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">{payment ? "Editar evento" : "Nuevo evento"}</p>
        <h2 className="mt-1 text-2xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>Evento de tesorería · Línea {line}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Fecha<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" required /></label>
          <label className="text-sm text-slate-300">Rubro<select value={category} onChange={(e) => setCategory(e.target.value as PaymentCategory)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#101826] px-3 py-2.5 text-white outline-none">{lineCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          {isDollar ? (
            <div className="sm:col-span-2 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4">
              <p className="text-sm font-semibold text-sky-100">Conversión a pesos argentinos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setRateMode("auto"); setRateSource("InfoDolar"); void loadBlueRate(); }} className={`rounded-full px-4 py-2 text-sm ${rateMode === "auto" ? "bg-sky-300 text-slate-950" : "bg-white/8 text-slate-200"}`}>{rateLoading ? "Consultando..." : "1. Usar dólar Blue promedio"}</button>
                <button type="button" onClick={() => { setRateMode("manual"); setRateSource("manual"); }} className={`rounded-full px-4 py-2 text-sm ${rateMode === "manual" ? "bg-white text-slate-950" : "bg-white/8 text-slate-200"}`}>2. Cargar manualmente</button>
              </div>
              {rateMode === "auto" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">Importe en USD<input value={dollarAmount} onChange={(e) => updateUsd(e.target.value)} placeholder="2.500,00" className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" required /></label>
                  <label className="text-sm text-slate-300">Tipo de cambio obtenido<input value={exchangeRate} readOnly className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" /></label>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">Importe manual en ARS<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="3.850.000,00" className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" required /></label>
                  <label className="text-sm text-slate-300">Tipo de cambio manual<input value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="1.540,00" className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" required /></label>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">Automático: (dólar Blue compra + venta) ÷ 2 desde InfoDolar. Manual: se guarda el importe en ARS y el tipo de cambio indicado.</p>
              <p className="mt-3 text-lg font-semibold text-white">Total en ARS: {amount ? `$ ${Number(amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "$ 0,00"}</p>
            </div>
          ) : (
            <label className="text-sm text-slate-300">Importe en pesos argentinos<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2.500.000,00" className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" required /></label>
          )}
          <label className="text-sm text-slate-300 sm:col-span-2">Cliente / beneficiario<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" /></label>
          <label className="text-sm text-slate-300 sm:col-span-2">Concepto<input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" /></label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none" /></label>
          <div className="sm:col-span-2"><p className="text-sm text-slate-300">Estado</p><div className="mt-2 flex gap-2">{(["pendiente","pagado"] as const).map((item) => { const label = item === "pagado" && ((line === 2 && isIncomeCategory(category)) || (line === 1 && isLine1CollectedCategory(category))) ? "cobrado" : item; return <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full px-4 py-2 text-sm capitalize ${status === item ? "bg-white text-slate-950" : "bg-white/8 text-slate-300"}`}>{label}</button>; })}</div></div>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-between gap-3"><div>{payment && canDelete ? <button type="button" onClick={onDelete} className="text-sm text-rose-300">Eliminar</button> : null}</div><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-slate-300">Cancelar</button><button type="submit" disabled={loading} className="rounded-full bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-60">{loading ? "Guardando..." : "Guardar"}</button></div></div>
      </form>
    </div>
  );
}

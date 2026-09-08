"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { formatPlain, parseAmount } from "@/lib/money";
import type { AppSettings, PublicUser } from "@/lib/types";

export function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Elegí un archivo CSV o Excel.");
      return;
    }
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await apiFetch("/api/payments/import", { method: "POST", body });
      const data = (await response.json()) as { created?: number; skipped?: number; errors?: string[]; error?: string };
      if (!response.ok && !data.created) {
        setMessage(data.error ?? "No se pudo importar.");
        setErrors(data.errors ?? []);
        return;
      }
      setMessage(`Se importaron ${data.created ?? 0} pagos.${data.skipped ? ` ${data.skipped} filas omitidas.` : ""}`);
      setErrors(data.errors ?? []);
      onImported();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-[28px] border border-[var(--line)] bg-[#101826] p-6"
      >
        <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">Importar</p>
        <h2 className="mt-1 text-2xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
          Excel o CSV
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Columnas: fecha, importe, rubro. Opcionales: beneficiario, descripcion, estado, notas.
          Fechas en DD/MM/AAAA o AAAA-MM-DD. Importes con formato argentino o decimal.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-5 block w-full text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white"
        />
        {message ? <p className="mt-4 text-sm text-emerald-200">{message}</p> : null}
        {errors.length ? (
          <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-rose-300">
            {errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            className="text-sm text-[var(--gold-2)]"
            onClick={async () => {
              const response = await apiFetch("/api/payments/template");
              if (!response.ok) return;
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "plantilla-pagos.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar plantilla
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-slate-300">
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-[#1a1408]"
            >
              {loading ? "Importando..." : "Importar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function SettingsModal({
  open,
  user,
  settings,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: PublicUser;
  settings: AppSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [weeklyCap, setWeeklyCap] = useState(formatPlain(settings.weeklyCap));
  const [checksWeeklyCap, setChecksWeeklyCap] = useState(formatPlain(settings.checksWeeklyCap));
  const [greenMax, setGreenMax] = useState(formatPlain(settings.greenMax));
  const [yellowMax, setYellowMax] = useState(formatPlain(settings.yellowMax));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyName(settings.companyName);
    setWeeklyCap(formatPlain(settings.weeklyCap));
    setChecksWeeklyCap(formatPlain(settings.checksWeeklyCap));
    setGreenMax(formatPlain(settings.greenMax));
    setYellowMax(formatPlain(settings.yellowMax));
    setMessage("");
  }, [open, settings]);

  if (!open) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName,
          weeklyCap: parseAmount(weeklyCap),
          checksWeeklyCap: parseAmount(checksWeeklyCap),
          greenMax: parseAmount(greenMax),
          yellowMax: parseAmount(yellowMax),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo guardar.");
        return;
      }
      onSaved();
      setMessage("Configuración actualizada.");
    } finally {
      setLoading(false);
    }
  }

  async function seed(reset: boolean) {
    setLoading(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/seed", {
        method: "POST",
        body: JSON.stringify({ reset }),
      });
      const data = (await response.json()) as { error?: string; payments?: number };
      if (!response.ok) {
        setMessage(data.error ?? "No se pudieron cargar los datos.");
        return;
      }
      onSaved();
      setMessage(`Datos de demostración listos (${data.payments ?? 0} pagos).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={save}
        className="w-full max-w-lg rounded-[28px] border border-[var(--line)] bg-[#101826] p-6"
      >
        <p className="text-xs tracking-[0.16em] text-[var(--gold)] uppercase">Configuración</p>
        <h2 className="mt-1 text-2xl text-white" style={{ fontFamily: "var(--font-display), Fraunces, serif" }}>
          Tope y semáforo
        </h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm text-slate-300">
            Empresa
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Tope semanal general
            <input
              value={weeklyCap}
              onChange={(event) => setWeeklyCap(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Tope semanal solo cheques
            <input
              value={checksWeeklyCap}
              onChange={(event) => setChecksWeeklyCap(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">
              Verde hasta
              <input
                value={greenMax}
                onChange={(event) => setGreenMax(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
              />
            </label>
            <label className="text-sm text-slate-300">
              Amarillo hasta
              <input
                value={yellowMax}
                onChange={(event) => setYellowMax(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
              />
            </label>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-emerald-200">{message}</p> : null}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => seed(true)} className="text-sm text-slate-400">
            Recargar demo
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-slate-300">
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-[#1a1408]"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

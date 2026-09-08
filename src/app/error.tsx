"use client";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#081018] px-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101826] p-8 text-slate-200">
        <p className="text-sm tracking-[0.16em] text-rose-300 uppercase">Error de servidor</p>
        <h1 className="mt-3 text-2xl text-white">No se pudo cargar el panel</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          En Vercel, Settings → Environment Variables, tiene que existir <strong className="text-white">DATABASE_URL</strong> con
          el link de Supabase (puerto <strong className="text-white">5432</strong>) y después Redeploy.
        </p>
        <p className="mt-4 rounded-2xl bg-black/30 p-3 text-xs break-all text-rose-200">{error.message}</p>
      </section>
    </main>
  );
}

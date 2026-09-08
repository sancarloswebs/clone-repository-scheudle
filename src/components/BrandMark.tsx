export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl text-[11px]",
    md: "h-11 w-11 rounded-xl text-xs",
    lg: "h-16 w-16 rounded-2xl text-base",
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`brand-mark inline-flex shrink-0 items-center justify-center border border-[var(--gold)]/30 bg-[radial-gradient(circle_at_30%_25%,rgba(240,217,166,.32),transparent_35%),linear-gradient(145deg,#172334,#0b111a)] font-semibold tracking-[0.12em] text-[var(--gold-2)] shadow-[0_12px_35px_rgba(0,0,0,.28)] ${sizes[size]}`}
    >
      SC
    </span>
  );
}

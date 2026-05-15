import { clsx } from "clsx";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.24em] text-ember">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-lg border border-white bg-white/90 p-4 shadow-panel", className)}>{children}</section>;
}

export function Stat({ label, value, tone = "ink" }: { label: string; value: string | number; tone?: "ink" | "mint" | "ember" | "sky" }) {
  const tones = {
    ink: "bg-ink text-white",
    mint: "bg-mint text-white",
    ember: "bg-ember text-white",
    sky: "bg-sky-600 text-white",
  };
  return (
    <Card className={clsx("min-h-32", tones[tone])}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-4 break-words text-3xl font-black tracking-tight">{value}</p>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";
export const buttonClass = "inline-flex h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-bold text-white hover:bg-slate-800";
export const ghostButtonClass = "inline-flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50";

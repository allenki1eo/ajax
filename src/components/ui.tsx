import { clsx } from "clsx";
import Link from "next/link";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.24em] text-jungle">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-canopy sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-xl border border-white/80 bg-white/90 p-4 shadow-panel backdrop-blur sm:p-5", className)}>{children}</section>;
}

export function Stat({ label, value, tone = "ink" }: { label: string; value: string | number; tone?: "ink" | "mint" | "ember" | "sky" }) {
  const tones = {
    ink: "bg-canopy text-white",
    mint: "bg-jungle text-white",
    ember: "bg-clay text-white",
    sky: "bg-stone text-white",
  };
  return (
    <Card className={clsx("min-h-32 overflow-hidden relative", tones[tone])}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
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

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
      <p className="font-black text-canopy">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  function href(nextPage: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(nextPage));
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing <span className="font-bold text-slate-900">{from}-{to}</span> of <span className="font-bold text-slate-900">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link aria-disabled={safePage <= 1} className={clsx(ghostButtonClass, safePage <= 1 && "pointer-events-none opacity-45")} href={href(safePage - 1)}>
          Previous
        </Link>
        <span className="rounded-md bg-leaf px-3 py-2 font-bold text-canopy">
          {safePage} / {totalPages}
        </span>
        <Link aria-disabled={safePage >= totalPages} className={clsx(ghostButtonClass, safePage >= totalPages && "pointer-events-none opacity-45")} href={href(safePage + 1)}>
          Next
        </Link>
      </div>
    </div>
  );
}

export const inputClass = "h-11 w-full rounded-md border border-slate-200 bg-white/95 px-3 text-sm text-slate-900 outline-none transition focus:border-jungle focus:ring-2 focus:ring-jungle/15";
export const buttonClass = "inline-flex h-11 items-center justify-center rounded-md bg-canopy px-4 text-sm font-bold text-white transition hover:-translate-y-[1px] hover:bg-slate-800 active:translate-y-0";
export const ghostButtonClass = "inline-flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:-translate-y-[1px] hover:bg-leaf active:translate-y-0";

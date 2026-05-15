import { clsx } from "clsx";
import {
  Pagination as ShadPagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card as ShadCard } from "@/components/ui/card";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ShadCard className={clsx("border bg-card p-5 shadow-sm", className)}>{children}</ShadCard>;
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "primary" | "destructive" | "success" | "info" }) {
  const tones = {
    default: "bg-card text-card-foreground border",
    primary: "bg-primary text-primary-foreground border-primary",
    destructive: "bg-destructive text-destructive-foreground border-destructive",
    success: "bg-emerald-600 text-white border-emerald-600",
    info: "bg-blue-600 text-white border-blue-600",
  };
  const isColored = tone !== "default";
  return (
    <ShadCard className={clsx("relative min-h-32 overflow-hidden border p-5 shadow-sm", tones[tone])}>
      {isColored && <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />}
      <p className={clsx("text-sm font-medium", isColored ? "opacity-80" : "text-muted-foreground")}>{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold tracking-tight">{value}</p>
    </ShadCard>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
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
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of <span className="font-semibold text-foreground">{total}</span>
      </p>
      <ShadPagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem className={clsx(safePage <= 1 && "pointer-events-none opacity-40")}>
            <PaginationPrevious href={href(safePage - 1)} />
          </PaginationItem>
          <PaginationItem>
            <span className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium text-foreground">
              {safePage} / {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem className={clsx(safePage >= totalPages && "pointer-events-none opacity-40")}>
            <PaginationNext href={href(safePage + 1)} />
          </PaginationItem>
        </PaginationContent>
      </ShadPagination>
    </div>
  );
}

export const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const buttonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export const ghostButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

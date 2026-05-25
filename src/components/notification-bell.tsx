"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";

export type NotificationAlert = {
  type: "low_stock" | "pending_sale" | "pending_purchase";
  message: string;
  href: string;
};

const icons = {
  low_stock: AlertTriangle,
  pending_sale: ShoppingCart,
  pending_purchase: Truck,
};

const colors = {
  low_stock: "bg-orange-100 text-orange-600",
  pending_sale: "bg-blue-100 text-blue-600",
  pending_purchase: "bg-violet-100 text-violet-600",
};

export function NotificationBell({ alerts }: { alerts: NotificationAlert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Bell size={16} />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-card shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {alerts.length === 0 ? "All clear" : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} need attention`}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No alerts right now</p>
            ) : (
              <div className="divide-y">
                {alerts.map((alert, i) => {
                  const Icon = icons[alert.type];
                  return (
                    <Link
                      key={i}
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors[alert.type]}`}>
                        <Icon size={12} />
                      </span>
                      <p className="text-sm text-foreground">{alert.message}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {alerts.length > 0 && (
            <div className="border-t px-4 py-2.5">
              <Link href="/inventory" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
                Go to inventory →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

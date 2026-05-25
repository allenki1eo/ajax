import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { Boxes, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { NavLinks } from "@/components/nav-links";
import { NotificationBell, type NotificationAlert } from "@/components/notification-bell";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const lowStockItems = await rows<{ name: string; stock_quantity: number }>(
    "SELECT name, stock_quantity FROM products WHERE status = 'active' AND stock_quantity <= min_stock_level ORDER BY stock_quantity ASC LIMIT 15",
  );
  const pendingSales = await rows<{ id: number }>(
    "SELECT id FROM sales WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5",
  );
  const pendingPurchases = await rows<{ id: number }>(
    "SELECT id FROM purchases WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5",
  );

  const alerts: NotificationAlert[] = [
    ...lowStockItems.map((p) => ({
      type: "low_stock" as const,
      message: `${p.name} — only ${p.stock_quantity} unit${p.stock_quantity !== 1 ? "s" : ""} left`,
      href: "/inventory",
    })),
    ...pendingSales.map((s) => ({
      type: "pending_sale" as const,
      message: `Sale #${String(s.id).padStart(4, "0")} is still pending`,
      href: "/sales",
    })),
    ...pendingPurchases.map((p) => ({
      type: "pending_purchase" as const,
      message: `Purchase #${String(p.id).padStart(4, "0")} is still pending`,
      href: "/purchases",
    })),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Global confirm handler for delete forms */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('submit', function(e) {
          var msg = e.target.getAttribute('data-confirm');
          if (msg && !confirm(msg)) e.preventDefault();
        });
      ` }} />

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu size={18} />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground border-sidebar-border p-0">
                <SheetHeader className="px-4 py-5 border-b border-sidebar-border">
                  <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                      <Boxes size={16} />
                    </span>
                    StockManager
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-2 mt-1">
                  <NavLinks mobile />
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <Boxes size={16} />
              </span>
              <span className="text-base font-semibold tracking-tight text-foreground">StockManager</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell alerts={alerts} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user.full_name}</p>
              <Badge variant="secondary" className="mt-0.5 capitalize text-xs">{user.role}</Badge>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 rounded-xl bg-sidebar text-sidebar-foreground overflow-hidden shadow-md">
            <div className="px-4 py-4 border-b border-sidebar-border">
              <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">Menu</p>
            </div>
            <div className="p-2">
              <NavLinks />
            </div>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

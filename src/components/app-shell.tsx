import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { BarChart3, Boxes, Home, LogOut, Menu, PackagePlus, Receipt, Settings, ShoppingCart, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchases", label: "Purchases", icon: PackagePlus },
  { href: "/inventory", label: "Inventory", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-lg" className="lg:hidden">
                  <Menu size={19} />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-r border-white/70 bg-white/95">
                <SheetHeader>
                  <SheetTitle className="text-canopy">Jungle</SheetTitle>
                </SheetHeader>
                <nav className="grid gap-1 px-4">
                  {nav.map((item) => (
                    <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-leaf">
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="hidden">
              <span className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white">
                <Menu size={19} />
              </span>
            </div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-canopy text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                <Boxes size={19} />
              </span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-jungle">Jungle</span>
                <span className="block text-lg font-black leading-4 text-canopy">Stock</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" className="h-10 gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-lg border border-white bg-white/80 p-2 shadow-panel">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-leaf hover:text-canopy">
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <div className="mt-4 rounded-md bg-leaf p-3 text-xs text-slate-700">
              <UsersRound className="mb-2" size={18} />
              Built for stock, sales, purchasing, and profit visibility.
            </div>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

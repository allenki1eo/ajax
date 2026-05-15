import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { BarChart3, Boxes, Home, LogOut, Menu, PackagePlus, Receipt, Settings, ShoppingCart, UsersRound } from "lucide-react";

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
            <details className="group lg:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white">
                <Menu size={19} />
              </summary>
              <nav className="absolute left-3 right-3 top-14 rounded-lg border border-slate-200 bg-white p-2 shadow-panel">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white">
                <Boxes size={19} />
              </span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-ember">Business</span>
                <span className="block text-lg font-black leading-4 text-ink">Manager</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
            <form action={logoutAction}>
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-lg border border-white bg-white/80 p-2 shadow-panel">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <div className="mt-4 rounded-md bg-skyglass p-3 text-xs text-slate-700">
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

import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { Boxes, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { NavLinks } from "@/components/nav-links";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu size={18} />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-background">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-foreground">Navigation</SheetTitle>
                </SheetHeader>
                <nav className="grid gap-0.5">
                  <NavLinks mobile />
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Boxes size={16} />
              </span>
              <span className="text-base font-semibold tracking-tight text-foreground">StockManager</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user.full_name}</p>
              <Badge variant="secondary" className="mt-0.5 capitalize">{user.role}</Badge>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[14rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 rounded-lg border bg-card p-2 shadow-sm">
            <NavLinks />
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

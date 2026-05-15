"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BarChart3, Boxes, Home, PackagePlus, Receipt, Settings, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchases", label: "Purchases", icon: PackagePlus },
  { href: "/inventory", label: "Inventory", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {nav.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mobile ? "mb-0.5 gap-3" : "mb-0.5 gap-2.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon size={mobile ? 16 : 15} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

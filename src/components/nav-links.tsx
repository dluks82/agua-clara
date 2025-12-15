"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leituras", label: "Leituras" },
  { href: "/eventos", label: "Eventos" },
  { href: "/configuracoes", label: "Configurações", adminOnly: true },
  { href: "/usuarios", label: "Usuários", adminOnly: true },
];

export function NavLinks({ showAdminLinks }: { showAdminLinks: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <div className="flex space-x-4">
      {NAV_ITEMS.filter((item) => (item.adminOnly ? showAdminLinks : true)).map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-sm transition-colors hover:text-primary",
              active ? "font-medium text-primary" : "text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}


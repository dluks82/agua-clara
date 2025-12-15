"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function MobileNav({
  appName,
  tenantName,
  showAdminLinks,
}: {
  appName: string;
  tenantName: string | null;
  showAdminLinks: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Abrir menu">
          <MenuIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="fixed inset-y-0 right-0 left-auto h-full w-[85vw] max-w-sm translate-x-0 translate-y-0 rounded-none p-0 flex flex-col gap-0"
      >
        <DialogHeader className="shrink-0 px-4 py-4 text-left">
          <DialogTitle className="text-base">{appName}</DialogTitle>
          <DialogDescription className="sr-only">Menu de navegação e ações da conta.</DialogDescription>
          {tenantName ? (
            <div className="text-xs text-muted-foreground">{tenantName}</div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <NavLink href="/dashboard" active={pathname === "/dashboard"} onNavigate={() => setOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink href="/leituras" active={pathname === "/leituras"} onNavigate={() => setOpen(false)}>
            Leituras
          </NavLink>
          <NavLink href="/eventos" active={pathname === "/eventos"} onNavigate={() => setOpen(false)}>
            Eventos
          </NavLink>
          {showAdminLinks ? (
            <>
              <NavLink href="/configuracoes" active={pathname === "/configuracoes"} onNavigate={() => setOpen(false)}>
                Configurações
              </NavLink>
              <NavLink href="/usuarios" active={pathname === "/usuarios"} onNavigate={() => setOpen(false)}>
                Usuários
              </NavLink>
            </>
          ) : null}

          <Separator className="my-3" />

          <div className="px-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                void signOut({ callbackUrl: "/login" });
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavLink({
  href,
  children,
  active,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn("w-full justify-start", active ? "bg-muted text-primary" : undefined)}
      onClick={onNavigate}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}

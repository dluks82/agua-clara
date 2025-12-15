import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AccountActions } from "@/components/account-actions";
import { clearActiveTenant } from "@/app/actions";
import { cookies } from "next/headers";
import { db } from "@/db";
import { memberships, tenants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Água Clara - Sistema de Monitoramento",
  description: "Sistema de monitoramento operacional do consumo de água",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantNamePromise = (async () => {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("ac_tenant")?.value;
    if (!tenantId) return null;
    const row = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    return row?.name ?? null;
  })();

  const showUsersLinkPromise = (async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return false;
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("ac_tenant")?.value;
    if (!tenantId) return false;

    const m = await db.query.memberships.findFirst({
      where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
    });
    return m?.role === "owner" || m?.role === "admin";
  })();

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="leading-tight">
                  <h1 className="text-2xl font-bold text-primary">Água Clara</h1>
                  <TenantName tenantNamePromise={tenantNamePromise} />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex space-x-4">
                    <a href="/dashboard" className="text-sm hover:text-primary">
                      Dashboard
                    </a>
                    <a href="/leituras" className="text-sm hover:text-primary">
                      Leituras
                    </a>
                    <a href="/eventos" className="text-sm hover:text-primary">
                      Eventos
                    </a>
                    <ConfigLink showAdminLinksPromise={showUsersLinkPromise} />
                    <UsersLink showUsersLinkPromise={showUsersLinkPromise} />
                  </div>
                  <AccountActions clearTenantAction={clearActiveTenant} />
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            {children}
            <Toaster />
          </main>
        </div>
      </body>
    </html>
  );
}

async function TenantName({ tenantNamePromise }: { tenantNamePromise: Promise<string | null> }) {
  const tenantName = await tenantNamePromise;
  if (!tenantName) return null;
  return <div className="text-xs text-muted-foreground">{tenantName}</div>;
}

async function UsersLink({ showUsersLinkPromise }: { showUsersLinkPromise: Promise<boolean> }) {
  const show = await showUsersLinkPromise;
  if (!show) return null;
  return (
    <a href="/usuarios" className="text-sm hover:text-primary">
      Usuários
    </a>
  );
}

async function ConfigLink({ showAdminLinksPromise }: { showAdminLinksPromise: Promise<boolean> }) {
  const show = await showAdminLinksPromise;
  if (!show) return null;
  return (
    <a href="/configuracoes" className="text-sm hover:text-primary">
      Configurações
    </a>
  );
}

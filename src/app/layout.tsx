import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AccountActions } from "@/components/account-actions";
import { cookies } from "next/headers";
import { db } from "@/db";
import { memberships, tenants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { MobileNav } from "@/components/mobile-nav";
import { SignInGoogleButton } from "@/components/sign-in-google-button";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { selectTenant } from "@/app/select-tenant/actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Água Clara - Sistema de Monitoramento",
  description: "Sistema de monitoramento operacional do consumo de água",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("ac_tenant")?.value ?? null;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAuthed = Boolean(userId);

  const [tenantRow, membershipRow] = await (async () => {
    try {
      return await Promise.all([
        tenantId ? db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }) : Promise.resolve(null),
        tenantId && userId
          ? db.query.memberships.findFirst({
              where: and(eq(memberships.user_id, userId), eq(memberships.tenant_id, tenantId)),
            })
          : Promise.resolve(null),
      ]);
    } catch {
      return [null, null] as const;
    }
  })();

  const tenantName = tenantRow?.name ?? null;
  const showAdminLinks = membershipRow?.role === "owner" || membershipRow?.role === "admin";

  const organizations = await (async () => {
    if (!userId) return [] as Array<{ id: string; name: string; role: string }>;
    try {
      return await db
        .select({
          id: memberships.tenant_id,
          name: tenants.name,
          role: memberships.role,
        })
        .from(memberships)
        .innerJoin(tenants, eq(tenants.id, memberships.tenant_id))
        .where(eq(memberships.user_id, userId))
        .orderBy(tenants.name);
    } catch {
      return [] as Array<{ id: string; name: string; role: string }>;
    }
  })();

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b">
            <div className="container mx-auto px-4 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="leading-tight">
                  <h1 className="text-xl font-bold text-primary sm:text-2xl">Água Clara</h1>
                  {isAuthed ? (
                    <OrganizationSwitcher
                      activeOrganizationId={tenantId}
                      activeOrganizationName={tenantName}
                      organizations={organizations}
                      selectOrganizationAction={selectTenant}
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-2 sm:gap-6">
                  <div className="sm:hidden">
                    {isAuthed ? (
                      <MobileNav
                        appName="Água Clara"
                        tenantName={tenantName}
                        showAdminLinks={showAdminLinks}
                      />
                    ) : (
                      <SignInGoogleButton label="Entrar" variant="outline" size="sm" callbackUrl="/select-tenant" />
                    )}
                  </div>
                  <div className="hidden items-center gap-6 sm:flex">
                    {isAuthed ? (
                      <>
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
                          <ConfigLink show={showAdminLinks} />
                          <UsersLink show={showAdminLinks} />
                        </div>
                        <AccountActions />
                      </>
                    ) : (
                      <SignInGoogleButton label="Entrar" variant="outline" size="sm" callbackUrl="/select-tenant" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-4 sm:py-8">
            {children}
            <Toaster />
          </main>
        </div>
      </body>
    </html>
  );
}

function UsersLink({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <a href="/usuarios" className="text-sm hover:text-primary">
      Usuários
    </a>
  );
}

function ConfigLink({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <a href="/configuracoes" className="text-sm hover:text-primary">
      Configurações
    </a>
  );
}

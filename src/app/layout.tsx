import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AccountActions } from "@/components/account-actions";
import { clearActiveTenant } from "@/app/actions";
import { cookies } from "next/headers";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Água Clara</h1>
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
                    <a href="/configuracoes" className="text-sm hover:text-primary">
                      Configurações
                    </a>
                  </div>
                  <AccountActions
                    clearTenantAction={clearActiveTenant}
                    tenantNamePromise={tenantNamePromise}
                  />
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

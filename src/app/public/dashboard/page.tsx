import { notFound } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { publicDashboardLinks, settings, tenants } from "@/db/schema";
import { hashPublicToken } from "@/lib/public-dashboard";
import { billingCycleRange, getDashboardData } from "@/lib/data";
import { DashboardCharts } from "@/app/dashboard/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function PublicDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? null;
  if (!token) notFound();

  const tokenHash = hashPublicToken(token);
  const now = new Date();

  const link = await db.query.publicDashboardLinks.findFirst({
    where: and(
      eq(publicDashboardLinks.token_hash, tokenHash),
      isNull(publicDashboardLinks.revoked_at),
      gt(publicDashboardLinks.expires_at, now)
    ),
  });

  if (!link) notFound();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, link.tenant_id) });
  if (!tenant) notFound();

  const billingCycleDay = await resolveBillingCycleDay(link.tenant_id);
  const period = billingCycleRange(new Date(), billingCycleDay);

  const dashboard = await getDashboardData(link.tenant_id, period);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{tenant.name}</div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Período atual ({formatPtBrDate(period.from)} → {formatPtBrDate(period.to)})
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Produção Total" value={`${dashboard.kpis.producao_total_m3.toFixed(2)} m³`} />
        <KpiCard title="Vazão Média" value={dashboard.kpis.q_avg_lmin ? `${dashboard.kpis.q_avg_lmin.toFixed(1)} L/min` : "N/A"} />
        <KpiCard title="Operação" value={`${dashboard.kpis.horas_total_h.toFixed(1)} h`} />
        <KpiCard title="COV" value={dashboard.kpis.cov_q_pct ? `${dashboard.kpis.cov_q_pct.toFixed(1)}%` : "N/A"} />
      </div>

      <DashboardCharts
        intervals={dashboard.intervals}
        periodFrom={period.from.toISOString()}
        periodTo={period.to.toISOString()}
        showForecast={period.from <= now && now <= period.to}
      />

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        Acesso público: esta página é somente leitura e não mostra alertas, usuários ou detalhes internos.
      </div>
    </div>
  );
}

async function resolveBillingCycleDay(tenantId: string) {
  const row = await db.query.settings.findFirst({
    where: and(eq(settings.tenant_id, tenantId), eq(settings.key, "billing_cycle_day")),
  });
  const parsed = row ? Number.parseInt(row.value, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 31 ? parsed : 1;
}

function formatPtBrDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

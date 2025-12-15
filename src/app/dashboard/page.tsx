import { getDashboardData, resolveDashboardPeriod } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExportButton } from "@/components/export-button";
import { PeriodNavigator } from "@/components/period-navigator";
import { getBillingCycleDay } from "@/app/actions";
import { AlertTriangle, Droplets, Clock, Activity, ClipboardList } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireTenant } from "@/lib/tenancy";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/help-hint";
import { DashboardCharts } from "@/app/dashboard/dashboard-charts";
import { unstable_cache } from "next/cache";

function getCachedDashboardData(tenantId: string) {
  return unstable_cache(
    async (fromIso: string, toIso: string) => {
      return getDashboardData(tenantId, { from: new Date(fromIso), to: new Date(toIso) });
    },
    ["dashboard", tenantId],
    { tags: [`dashboard:${tenantId}`], revalidate: 300 }
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { tenantId, role } = await requireTenant("viewer");
  const resolvedSearchParams = await searchParams;
  const billingCycleDay = await getBillingCycleDay();

  const period = resolveDashboardPeriod({
    searchFrom: resolvedSearchParams.from,
    searchTo: resolvedSearchParams.to,
    billingCycleDay,
  });

  const now = new Date();
  const showForecast = period.from <= now && now <= period.to;

  const data = await getCachedDashboardData(tenantId)(period.from.toISOString(), period.to.toISOString());
  const canWrite = role !== "viewer";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do sistema de monitoramento de água
            </p>
          </div>


          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PeriodNavigator 
              billingCycleDay={billingCycleDay}
              currentFrom={period.from}
              currentTo={period.to}
            />
            <ExportButton />
          </div>
        </div>

        {/* Alertas */}
        {data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <Alert key={index} variant={alert.severity === "high" ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{alert.type.replace("_", " ").toUpperCase()}:</strong> {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {data.intervals.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Comece registrando leituras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                O dashboard precisa de <strong>pelo menos 2 leituras</strong> para calcular produção, horas e vazão no
                período.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/leituras">{canWrite ? "Cadastrar leituras" : "Ver leituras"}</Link>
                </Button>
                {!canWrite ? (
                  <div className="text-xs text-muted-foreground">
                    Você está como <code>viewer</code>. Peça a um admin/owner para registrar leituras.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Produção Total
                </CardTitle>
                <HelpHint
                  label="Ajuda: produção total"
                  content={
                    <p>
                      Volume total de água produzida no período, calculado pela diferença entre as leituras do
                      hidrômetro (m³).
                    </p>
                  }
                />
              </div>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.producao_total_m3.toFixed(2)} m³
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Vazão Média
                </CardTitle>
                <HelpHint
                  label="Ajuda: vazão média"
                  content={
                    <p>
                      Vazão média ponderada do sistema (Volume Total / Horas Totais). Reflete a capacidade real de
                      entrega.
                    </p>
                  }
                />
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.q_avg_lmin ? `${data.kpis.q_avg_lmin.toFixed(1)} L/min` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.kpis.q_avg_m3h ? `${data.kpis.q_avg_m3h.toFixed(2)} m³/h` : "Sem dados"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Horas Operação
                </CardTitle>
                <HelpHint
                  label="Ajuda: horas de operação"
                  content={
                    <p>
                      Tempo total de operação do sistema, calculado pela diferença entre as leituras do horímetro
                      (horas).
                    </p>
                  }
                />
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.horas_total_h.toFixed(1)} h
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  COV
                </CardTitle>
                <HelpHint
                  label="Ajuda: COV"
                  content={
                    <p>
                      Coeficiente de Variação da vazão (%). Mede a estabilidade do sistema: valores baixos indicam
                      operação estável, valores altos indicam oscilações.
                    </p>
                  }
                />
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.cov_q_pct ? `${data.kpis.cov_q_pct.toFixed(1)}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Coeficiente de Variação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Utilização
                </CardTitle>
                <HelpHint
                  label="Ajuda: utilização"
                  content={<p>Taxa de utilização da bomba no período (Horas Operação / Tempo Total).</p>}
                />
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.utilization_rate_pct ? `${data.kpis.utilization_rate_pct.toFixed(1)}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo ligado / Tempo total
              </p>
            </CardContent>
          </Card>
        </div>
        
        <DashboardCharts
          intervals={data.intervals}
          periodFrom={period.from.toISOString()}
          periodTo={period.to.toISOString()}
          showForecast={showForecast}
        />
      </div>
    </TooltipProvider>
  );
}

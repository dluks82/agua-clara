import { getDashboardData, resolveDashboardPeriod } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExportButton } from "@/components/export-button";
import { PeriodNavigator } from "@/components/period-navigator";
import { getBillingCycleDay } from "@/app/actions";
import { AlertTriangle, Droplets, Clock, Activity, ClipboardList, ShieldCheck } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireTenant } from "@/lib/tenancy";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/help-hint";
import { DashboardCharts } from "@/app/dashboard/dashboard-charts";
import { unstable_cache } from "next/cache";
import { NewReadingDialog } from "@/app/dashboard/new-reading-dialog";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

function getCachedDashboardData(tenantId: string) {
  return unstable_cache(
    async (fromIso: string, toIso: string) => {
      const from = new Date(fromIso);
      const to = new Date(toIso);
      const data = await getDashboardData(tenantId, { from, to });
      
      const now = new Date();
      const effectiveTo = (from <= now && now <= to) ? now : to;
      const elapsedMs = Math.max(0, effectiveTo.getTime() - from.getTime());
      const durationMs = to.getTime() - from.getTime();
      const fraction = durationMs > 0 ? elapsedMs / durationMs : 0;
      
      // Recua os limites retroagindo civilmente exatos 1 mês no calendário
      const prevFrom = new Date(from);
      prevFrom.setMonth(prevFrom.getMonth() - 1);
      
      const prevToFull = new Date(to);
      prevToFull.setMonth(prevToFull.getMonth() - 1);
      
      // A fração percorrida (MTD) será estritamente proporcional à duração do mês passado
      const prevDurationMs = prevToFull.getTime() - prevFrom.getTime();
      const prevTo = new Date(prevFrom.getTime() + (prevDurationMs * fraction));
      
      const prevData = await getDashboardData(tenantId, { from: prevFrom, to: prevTo });
      const prevDataFull = await getDashboardData(tenantId, { from: prevFrom, to: prevToFull });
      
      return { 
        ...data, 
        previousKpis: prevData.kpis,
        previousKpisFull: prevDataFull.kpis
      };
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

  const lastReading = await (async () => {
    try {
      const rows = await db
        .select({
          ts: readings.ts,
          hydrometer_m3: readings.hydrometer_m3,
          horimeter_h: readings.horimeter_h,
        })
        .from(readings)
        .where(eq(readings.tenant_id, tenantId))
        .orderBy(desc(readings.ts))
        .limit(1);
      return rows[0] ?? null;
    } catch {
      return null;
    }
  })();

  const productionEstimateM3 = (() => {
    if (!showForecast) return null;
    if (data.intervals.length === 0) return null;

    const latestRealTs = data.readings
      .filter((r) => r.id !== -1)
      .map((r) => (r.ts instanceof Date ? r.ts : new Date(r.ts)))
      .filter((ts) => !Number.isNaN(ts.getTime()) && period.from <= ts && ts <= period.to && ts <= now)
      .reduce<Date | null>((max, ts) => (max && max > ts ? max : ts), null);
    if (!latestRealTs) return null;

    const totalSpanMs = period.to.getTime() - period.from.getTime();
    const elapsedMs = latestRealTs.getTime() - period.from.getTime();
    if (totalSpanMs <= 0 || elapsedMs <= 0) return null;

    const producedSoFar = data.kpis.producao_total_m3;
    const estimate = (producedSoFar / elapsedMs) * totalSpanMs;
    return Math.max(producedSoFar, estimate);
  })();

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
            {canWrite ? <NewReadingDialog variant="outline" /> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ExportButton from={period.from.toISOString()} to={period.to.toISOString()} mode="pdf" />
              <ExportButton from={period.from.toISOString()} to={period.to.toISOString()} mode="csv" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última leitura</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              {lastReading ? (
                <>
                  <div className="text-sm text-muted-foreground">{formatPtBrDateTime(lastReading.ts)}</div>
                  <div className="text-base font-semibold">
                    {Number.parseFloat(lastReading.hydrometer_m3).toFixed(2)} m³ ·{" "}
                    {Number.parseFloat(lastReading.horimeter_h).toFixed(1)} h
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma leitura registrada ainda.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Estimativa do período</CardTitle>
                <HelpHint
                  label="Ajuda: estimativa do período"
                  content={
                    <p>
                      Projeção simples baseada no ritmo de produção observado até a última leitura do período. Use como
                      referência (não é uma previsão oficial).
                    </p>
                  }
                />
              </div>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              {productionEstimateM3 !== null ? (
                <>
                  <div className="text-2xl font-bold">{productionEstimateM3.toFixed(1)} m³</div>
                  <div className="text-xs text-muted-foreground">Estimativa para o fechamento do período</div>
                  <TrendBadge
                    current={productionEstimateM3}
                    previous={data.previousKpisFull?.producao_total_m3}
                  />
                </>
              ) : !showForecast ? (
                <>
                  <div className="text-2xl font-bold">{data.kpis.producao_total_m3.toFixed(1)} m³</div>
                  <div className="text-xs text-muted-foreground">Produção confirmada no período selecionado</div>
                  <TrendBadge
                    current={data.kpis.producao_total_m3}
                    previous={data.previousKpisFull?.producao_total_m3}
                  />
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Disponível quando há leituras suficientes no período em andamento.
                </div>
              )}
            </CardContent>
          </Card>

          <DataQualityCard dataQuality={data.dataQuality} />
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
                {canWrite ? (
                  <>
                    <NewReadingDialog className="w-full sm:w-auto" label="Cadastrar leitura" />
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/leituras">Ver leituras</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/leituras">Ver leituras</Link>
                  </Button>
                )}
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
              <TrendBadge 
                current={data.kpis.producao_total_m3} 
                previous={data.previousKpis?.producao_total_m3} 
              />
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
              <TrendBadge 
                current={data.kpis.q_avg_lmin} 
                previous={data.previousKpis?.q_avg_lmin} 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Operação</CardTitle>
                <HelpHint
                  label="Ajuda: operação"
                  content={
                    <p>
                      Mostra o tempo total de operação (horas) e a utilização no período (Horas Operação / Tempo Total
                      entre leituras).
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
                Utilização: {data.kpis.utilization_rate_pct ? `${data.kpis.utilization_rate_pct.toFixed(1)}%` : "N/A"}
              </p>
              <TrendBadge 
                current={data.kpis.utilization_rate_pct} 
                previous={data.previousKpis?.utilization_rate_pct} 
                inverse={true}
              />
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

function TrendBadge({ current, previous, inverse = false }: { current: number | null, previous: number | null, inverse?: boolean }) {
  if (current === null || previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return <span className="text-muted-foreground flex items-center text-xs mt-2"><Minus className="w-3 h-3 mr-1"/> Tendência estável</span>;
  
  const isPositive = pct > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const color = isGood ? "text-emerald-500" : "text-destructive";
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <span className={`flex items-center text-xs mt-2 font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1"/>
      {isPositive ? "+" : ""}{pct.toFixed(1)}% vs. anterior
    </span>
  );
}

function DataQualityCard({ dataQuality }: { dataQuality: import("@/lib/data-quality").DataQuality | null }) {
  const levelColor = dataQuality
    ? dataQuality.level === "ALTA"
      ? "text-emerald-500"
      : dataQuality.level === "MÉDIA"
        ? "text-amber-500"
        : "text-destructive"
    : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Qualidade dos Dados</CardTitle>
          <HelpHint
            label="Ajuda: qualidade dos dados"
            content={
              <div className="space-y-1 text-sm">
                <p>
                  Indica o quão confiáveis são os KPIs com base no comportamento de registro de
                  leituras no período — não avalia as leituras em si.
                </p>
                <p className="font-medium">Fatores avaliados:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Frequência (40%) — intervalo médio entre leituras</li>
                  <li>Regularidade (25%) — consistência dos intervalos</li>
                  <li>Cobertura (20%) — proporção do período com leituras</li>
                  <li>Gaps (15%) — ausência de lacunas longas</li>
                </ul>
              </div>
            }
          />
        </div>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {dataQuality ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{dataQuality.score}</span>
              <span className={`text-sm font-semibold ${levelColor}`}>{dataQuality.level}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {dataQuality.recommendations[0]}
            </p>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Sem dados suficientes para avaliar.</div>
        )}
      </CardContent>
    </Card>
  );
}

function formatPtBrDateTime(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

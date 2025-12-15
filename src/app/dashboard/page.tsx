import { getDashboardData } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlowChart } from "@/components/flow-chart";
import { ProductionChart } from "@/components/production-chart";
import { ExportButton } from "@/components/export-button";
import { PeriodNavigator } from "@/components/period-navigator";
import { getBillingCycleDay } from "@/app/actions";
import { AlertTriangle, Droplets, Clock, Activity, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsDialog } from "@/components/settings-dialog";
import { requireTenant } from "@/lib/tenancy";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { tenantId, role } = await requireTenant("viewer");
  const resolvedSearchParams = await searchParams;
  const billingCycleDay = await getBillingCycleDay();
  
  // Logic to determine currentFrom/currentTo for the Navigator if not in URL
  // We need to replicate the logic from data.ts or return it from getDashboardData
  // To avoid duplication, let's assume getDashboardData returns the used period.
  // We'll update getDashboardData to return 'period' metadata.
  
  const filter = resolvedSearchParams.from && resolvedSearchParams.to 
    ? { 
        type: "custom" as const, 
        from: new Date(resolvedSearchParams.from), 
        to: new Date(resolvedSearchParams.to) 
      }
    : undefined;

  const data = await getDashboardData(tenantId, filter);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do sistema de monitoramento de água
            </p>
          </div>


          <div className="flex items-center gap-2">
            {(role === "admin" || role === "owner") && <SettingsDialog />}
            <PeriodNavigator 
              billingCycleDay={billingCycleDay}
              currentFrom={data.period.from}
              currentTo={data.period.to}
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Produção Total
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Volume total de água produzida no período, calculado pela diferença 
                      entre as leituras do hidrômetro (m³).
                    </p>
                  </TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Vazão média ponderada do sistema (Volume Total / Horas Totais).
                      Reflete a capacidade real de entrega.
                    </p>
                  </TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Tempo total de operação do sistema, calculado pela diferença 
                      entre as leituras do horímetro (horas).
                    </p>
                  </TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Coeficiente de Variação da vazão (%). Mede a estabilidade do sistema: 
                      valores baixos indicam operação estável, valores altos indicam oscilações.
                    </p>
                  </TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Taxa de utilização da bomba no período (Horas Operação / Tempo Total).
                    </p>
                  </TooltipContent>
                </Tooltip>
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
        
        <div className="grid gap-4 md:grid-cols-2">
          <FlowChart data={data.intervals} />
          <ProductionChart data={data.intervals} />
        </div>
      </div>
    </TooltipProvider>
  );
}

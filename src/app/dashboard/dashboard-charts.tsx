"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Interval } from "@/lib/validations/intervals";

const FlowChart = dynamic(() => import("@/components/flow-chart").then((m) => m.FlowChart), {
  ssr: false,
  loading: () => <ChartSkeleton title="Gráfico de Vazão" />,
});

const ProductionChart = dynamic(
  () => import("@/components/production-chart").then((m) => m.ProductionChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton title="Produção Diária" />,
  }
);

export function DashboardCharts({
  intervals,
  periodFrom,
  periodTo,
  showForecast,
}: {
  intervals: Interval[];
  periodFrom: string;
  periodTo: string;
  showForecast: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FlowChart data={intervals} />
      <ProductionChart data={intervals} periodFrom={periodFrom} periodTo={periodTo} showForecast={showForecast} />
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Carregando…</div>
      </CardContent>
    </Card>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartFrame } from "@/components/chart-frame";

interface IntervalData {
  start: string;
  end: string;
  delta_v: number;
  delta_h: number;
  confidence: string;
}

interface ProductionChartProps {
  data: IntervalData[];
}

function formatIntervalLabel(start: Date, end: Date): string {
  const startDay = format(start, "dd", { locale: ptBR });
  const endDay = format(end, "dd", { locale: ptBR });
  const startMonth = format(start, "MM", { locale: ptBR });
  const endMonth = format(end, "MM", { locale: ptBR });

  if (startMonth === endMonth) {
    return `${startDay}-${endDay}/${endMonth}`;
  }
  return `${startDay}/${startMonth}-${endDay}/${endMonth}`;
}

const FILL_ALTA = "#3b82f6";
const FILL_BAIXA = "#f59e0b";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; delta_v: number; delta_h: number; confidence: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-medium">{d.label}</p>
      <p>Volume: {d.delta_v.toFixed(2)} m³</p>
      <p>Operação: {d.delta_h.toFixed(1)} h</p>
      <p className="text-xs text-muted-foreground">
        Confiança: {d.confidence === "ALTA" ? "Alta" : "Baixa"}
      </p>
    </div>
  );
}

export function ProductionChart({ data }: ProductionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produção por Intervalo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">
            Sem dados de produção disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .filter((item) => item.delta_v > 0)
    .map((item) => {
      const start = new Date(item.start);
      const end = new Date(item.end);
      return {
        label: formatIntervalLabel(start, end),
        delta_v: item.delta_v,
        delta_h: item.delta_h,
        confidence: item.confidence,
        fill: item.confidence === "ALTA" ? FILL_ALTA : FILL_BAIXA,
      };
    });

  const hasLowConfidence = chartData.some((d) => d.confidence === "BAIXA");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produção por Intervalo</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame
          height={260}
          className="w-full min-w-0"
          placeholder={<div className="flex h-full items-center justify-center text-muted-foreground">Carregando…</div>}
        >
          {({ width, height }) => (
            <BarChart
              width={width}
              height={height}
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                label={{ value: "Volume (m³)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delta_v" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartFrame>

        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FILL_ALTA }} />
            Alta confiança
          </span>
          {hasLowConfidence && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FILL_BAIXA }} />
              Baixa confiança
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

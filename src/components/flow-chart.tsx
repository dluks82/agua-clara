"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartFrame } from "@/components/chart-frame";

interface FlowData {
  start: string;
  end: string;
  delta_v: number;
  delta_h: number;
  q_m3h: number | null;
  l_min: number | null;
  l_s: number | null;
  confidence: string;
}

interface FlowChartProps {
  data: FlowData[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { dateLabel: string; l_min: number | null; q_m3h: number | null; confidence: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-medium">{d.dateLabel}</p>
      <p>Vazão: {d.l_min?.toFixed(1)} L/min</p>
      {d.q_m3h != null && <p className="text-muted-foreground">{d.q_m3h.toFixed(2)} m³/h</p>}
      <p className="text-xs text-muted-foreground">
        Confiança: {d.confidence === "ALTA" ? "Alta" : "Baixa"}
      </p>
    </div>
  );
}

export function FlowChart({ data }: FlowChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Vazão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">
            Sem dados de vazão disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .filter(item => item.q_m3h !== null)
    .map(item => ({
      ...item,
      timestamp: new Date(item.end).getTime(),
      dateLabel: format(new Date(item.end), "dd/MM", { locale: ptBR }),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico de Vazão</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame
          height={260}
          className="w-full min-w-0"
          placeholder={<div className="flex h-full items-center justify-center text-muted-foreground">Carregando…</div>}
        >
          {({ width, height }) => (
            <LineChart
              data={chartData}
              width={width}
              height={height}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis
                label={{ value: "Vazão (L/min)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="l_min"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: "#2563eb", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

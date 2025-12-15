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

export function FlowChart({ data }: FlowChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Vazão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
      dateLabel: format(new Date(item.end), "dd/MM HH:mm", { locale: ptBR }),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico de Vazão</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame
          height={300}
          className="w-full min-w-0"
          placeholder={<div className="flex h-full items-center justify-center text-muted-foreground">Carregando…</div>}
        >
          {({ width, height }) => (
            <LineChart data={chartData} width={width} height={height}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis
                label={{ value: "Vazão (L/min)", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} L/min`, "Vazão"]}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="l_min"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

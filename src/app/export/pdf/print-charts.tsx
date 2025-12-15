"use client";

import * as React from "react";
import { BarChart, Bar, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ChartFrame } from "@/components/chart-frame";
import { cn } from "@/lib/utils";
import type { Interval } from "@/lib/validations/intervals";

export function PrintCharts({
  intervals,
  periodFrom,
  periodTo,
  className,
}: {
  intervals: Interval[];
  periodFrom: string;
  periodTo: string;
  className?: string;
}) {
  const flowData = React.useMemo(() => {
    return intervals
      .filter((i) => i.l_min !== null)
      .map((i) => ({
        end: i.end,
        dateLabel: format(new Date(i.end), "dd/MM", { locale: ptBR }),
        l_min: i.l_min,
      }));
  }, [intervals]);

  const productionData = React.useMemo(() => {
    const from = new Date(periodFrom);
    const to = new Date(periodTo);
    const byDay = new Map<
      string,
      { dateKey: string; dateLabel: string; realProduction: number; estimatedProduction: number }
    >();

    const upsert = (date: Date, add: { real?: number; estimated?: number }) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const dateLabel = format(date, "dd/MM", { locale: ptBR });
      const row =
        byDay.get(dateKey) ?? { dateKey, dateLabel, realProduction: 0, estimatedProduction: 0 };
      row.realProduction += add.real ?? 0;
      row.estimatedProduction += add.estimated ?? 0;
      byDay.set(dateKey, row);
    };

    const distributeByDays = (startDate: Date, endDate: Date, totalProduction: number) => {
      const totalTimeMs = endDate.getTime() - startDate.getTime();
      const totalTimeHours = totalTimeMs / (1000 * 60 * 60);
      if (totalTimeHours <= 0) return;

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);

        const endOfCurrentDay = new Date(currentDate);
        endOfCurrentDay.setHours(23, 59, 59, 999);
        const periodEnd = endDate < endOfCurrentDay ? endDate : endOfCurrentDay;

        const dayTimeHours = (periodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
        const dayProduction = (dayTimeHours / totalTimeHours) * totalProduction;

        upsert(currentDate, { estimated: dayProduction });
        currentDate = nextDay;
      }
    };

    for (const i of intervals) {
      const start = new Date(i.start);
      const end = new Date(i.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      // Clip to selected period for a cleaner PDF chart
      const clippedStart = start < from ? from : start;
      const clippedEnd = end > to ? to : end;
      if (clippedEnd <= clippedStart) continue;

      const timeDiffHours = (clippedEnd.getTime() - clippedStart.getTime()) / (1000 * 60 * 60);

      // "Real" only when we have ~daily readings (≈24h ±2h)
      const isDailyReading = timeDiffHours >= 22 && timeDiffHours <= 26;

      if (isDailyReading) {
        // Attribute to the day of the ending reading
        upsert(clippedEnd, { real: i.delta_v });
      } else if (timeDiffHours > 26) {
        // For bigger gaps, distribute pro‑rata across covered days
        distributeByDays(clippedStart, clippedEnd, i.delta_v);
      } else {
        // Short irregular intervals: keep as estimated on end day
        upsert(clippedEnd, { estimated: i.delta_v });
      }
    }

    // Ensure the x-axis shows the entire range (including days with 0)
    const startKey = format(from, "yyyy-MM-dd");
    const endKey = format(to, "yyyy-MM-dd");
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const dateKey = format(d, "yyyy-MM-dd");
      if (dateKey < startKey || dateKey > endKey) continue;
      if (!byDay.has(dateKey)) upsert(d, {});
    }

    return [...byDay.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [intervals, periodFrom, periodTo]);

  return (
    <div className={cn("grid gap-6 md:grid-cols-2 print:grid-cols-1", className)}>
      <div className="rounded-lg border p-4">
        <div className="mb-2 text-sm font-medium">Vazão (L/min)</div>
        <ChartFrame height={260} className="w-full">
          {({ width, height }) => (
            <LineChart width={width} height={height} data={flowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="l_min" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ChartFrame>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-2 text-sm font-medium">Produção por dia (m³)</div>
        <ChartFrame height={260} className="w-full">
          {({ width, height }) => (
            <BarChart width={width} height={height} data={productionData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Bar dataKey="realProduction" stackId="p" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estimatedProduction" stackId="p" fill="#93c5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ChartFrame>
        <div className="mt-2 text-xs text-muted-foreground">
          Azul = leitura diária (real). Azul claro = estimativa (pró-rata quando há lacunas).
        </div>
      </div>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { ChartFrame } from "@/components/chart-frame";

interface ProductionData {
  start: string;
  end: string;
  delta_v: number;
  delta_h: number;
}

interface DailyProduction {
  date: string;
  dateLabel: string;
  production: number;
  hours: number;
  isEstimated: boolean;
  isForecast?: boolean;
  confidence?: 'low' | 'medium' | 'high';
}

interface ProductionChartProps {
  data: ProductionData[];
  periodFrom?: string;
  periodTo?: string;
  showForecast?: boolean;
}

export function ProductionChart({ data, periodFrom, periodTo, showForecast = true }: ProductionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produção Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados de produção disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  // Função para distribuir produção considerando horários específicos
  const distributeProductionByDays = (startDate: Date, endDate: Date, totalProduction: number, totalHours: number) => {
    const result: Record<string, { date: string; dateLabel: string; production: number; hours: number; isEstimated: boolean }> = {};
    
    // Calcular horas totais do período
    const totalTimeMs = endDate.getTime() - startDate.getTime();
    const totalTimeHours = totalTimeMs / (1000 * 60 * 60);
    
    // Distribuir proporcionalmente considerando o horário
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, "yyyy-MM-dd");
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      
      // Calcular o final do dia atual
      const endOfCurrentDay = new Date(currentDate);
      endOfCurrentDay.setHours(23, 59, 59, 999);
      
      // Determinar o fim do período para este dia
      const periodEnd = endDate < endOfCurrentDay ? endDate : endOfCurrentDay;
      
      // Calcular proporção do tempo neste dia
      const dayStart = currentDate.getTime();
      const dayEnd = periodEnd.getTime();
      const dayTimeMs = dayEnd - dayStart;
      const dayTimeHours = dayTimeMs / (1000 * 60 * 60);
      
      // Calcular produção e horas para este dia
      const dayProduction = (dayTimeHours / totalTimeHours) * totalProduction;
      const dayHours = (dayTimeHours / totalTimeHours) * totalHours;
      
      if (!result[dateKey]) {
        result[dateKey] = {
          date: dateKey,
          dateLabel: format(currentDate, "dd/MM", { locale: ptBR }),
          production: 0,
          hours: 0,
          isEstimated: true,
        };
      }
      
      result[dateKey].production += dayProduction;
      result[dateKey].hours += dayHours;
      
      // Mover para o próximo dia
      currentDate = nextDay;
    }
    
    return result;
  };

  // Processar dados com distribuição inteligente considerando horários
  const dailyProduction = data.reduce((acc, item) => {
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    const daysDiff = differenceInDays(endDate, startDate);

    // Verificar se é leitura diária (intervalo de ~24h com tolerância de ±2h)
    const timeDiffHours = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const isDailyReading = timeDiffHours >= 22 && timeDiffHours <= 26;
    
    if (isDailyReading) {
      // LEITURA REAL: Intervalo de ~24h, produção acontece no dia da leitura final
      const dateKey = format(endDate, "yyyy-MM-dd");
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          dateLabel: format(endDate, "dd/MM", { locale: ptBR }),
          production: 0,
          hours: 0,
          isEstimated: false, // REAL - leitura diária
        };
      }
      
      acc[dateKey].production += item.delta_v;
      acc[dateKey].hours += item.delta_h;
    } else if (timeDiffHours > 26) {
      // Intervalo maior que 26h: distribuir proporcionalmente considerando horários (estimado)
      const distributed = distributeProductionByDays(startDate, endDate, item.delta_v, item.delta_h);

      Object.entries(distributed).forEach(([dateKey, dayData]) => {
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            dateLabel: dayData.dateLabel,
            production: 0,
            hours: 0,
            isEstimated: true,
          };
        }

        acc[dateKey].production += dayData.production;
        acc[dateKey].hours += dayData.hours;
        acc[dateKey].isEstimated = true;
      });
    } else if (daysDiff === 0) {
      // Intervalo curto no mesmo dia (ou virada de dia pequena), mas não diário: atribuir ao dia final como estimado
      const dateKey = format(endDate, "yyyy-MM-dd");
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          dateLabel: format(endDate, "dd/MM", { locale: ptBR }),
          production: 0,
          hours: 0,
          isEstimated: true, // ESTIMADO - horário inconsistente
        };
      }
      
      acc[dateKey].production += item.delta_v;
      acc[dateKey].hours += item.delta_h;
    } else {
      // Para intervalos maiores, distribuir proporcionalmente considerando horários
      // Começar da própria data/hora da leitura inicial
      const distributed = distributeProductionByDays(startDate, endDate, item.delta_v, item.delta_h);
      
      Object.entries(distributed).forEach(([dateKey, dayData]) => {
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            dateLabel: dayData.dateLabel,
            production: 0,
            hours: 0,
            isEstimated: true, // ESTIMADO - distribuição proporcional
          };
        }
        
        // SOMAR ao invés de sobrescrever para acumular múltiplos intervalos
        acc[dateKey].production += dayData.production;
        acc[dateKey].hours += dayData.hours;
        
        // Se qualquer parte for estimada, marcar o dia como estimado
        if (dayData.isEstimated) {
          acc[dateKey].isEstimated = true;
        }
      });
    }
    
    return acc;
  }, {} as Record<string, DailyProduction>);

  // Projetar próximos 7 dias baseado na média dos últimos 7 dias
  const lastReading = data[data.length - 1];
  if (showForecast && lastReading) {
    const lastDate = new Date(lastReading.end);
    const recentDays = Object.values(dailyProduction).slice(-7);
    const avgProduction = recentDays.length > 0 
      ? recentDays.reduce((sum, d) => sum + d.production, 0) / recentDays.length 
      : 0;

    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(lastDate, i);
      const dateKey = format(futureDate, "yyyy-MM-dd");
      
      dailyProduction[dateKey] = {
        date: dateKey,
        dateLabel: format(futureDate, "dd/MM", { locale: ptBR }),
        production: avgProduction,
        hours: 0,
        isEstimated: true,
        isForecast: true,
      };
    }
  }

  let chartData = Object.values(dailyProduction)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => ({
      ...item,
      realProduction: !item.isEstimated && !item.isForecast ? item.production : 0,
      estimatedProduction: item.isEstimated && !item.isForecast ? item.production : 0,
      forecastProduction: item.isForecast ? item.production : 0,
    }));

  if (periodFrom && periodTo) {
    const fromKey = format(new Date(periodFrom), "yyyy-MM-dd");
    const toKey = format(new Date(periodTo), "yyyy-MM-dd");
    chartData = chartData.filter((item) => item.date >= fromKey && item.date <= toKey);
  }

  // Verificar se há dados estimados
  const hasEstimatedData = chartData.some(item => item.isEstimated);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produção Diária</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame
          height={300}
          className="w-full min-w-0"
          placeholder={<div className="flex h-full items-center justify-center text-muted-foreground">Carregando…</div>}
        >
          {({ width, height }) => (
            <BarChart width={width} height={height} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: "Produção (m³)", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)} m³`, name]}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend />
              <Bar dataKey="realProduction" fill="#3b82f6" name="Real" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estimatedProduction" fill="#93c5fd" name="Estimado" radius={[4, 4, 0, 0]} />
              <Bar dataKey="forecastProduction" fill="#dbeafe" name="Projeção" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ChartFrame>

        {hasEstimatedData && (
          <Alert className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Alguns valores são estimados por falta de leituras diárias.
              <br />
              <strong>Recomendação:</strong> Para melhor precisão e calibração do sistema, realize leituras diárias
              sempre no mesmo horário por pelo menos 7-14 dias. Isso permitirá identificar padrões semanais e melhorar
              as projeções.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

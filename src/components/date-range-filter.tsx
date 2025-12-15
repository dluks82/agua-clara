"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Preset = "cycle" | "7d" | "30d" | "all";

export function DateRangeFilter({
  billingCycleDay,
  value,
  onChange,
  showCustom = true,
}: {
  billingCycleDay: number;
  value: { from?: string; to?: string };
  onChange: (next: { from?: string; to?: string }) => void;
  showCustom?: boolean;
}) {
  const preset = React.useMemo(() => inferPreset(value, billingCycleDay), [value, billingCycleDay]);

  const [customFrom, setCustomFrom] = React.useState(() => isoToDateInput(value.from));
  const [customTo, setCustomTo] = React.useState(() => isoToDateInput(value.to));

  React.useEffect(() => {
    setCustomFrom(isoToDateInput(value.from));
    setCustomTo(isoToDateInput(value.to));
  }, [value.from, value.to]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={preset === "cycle" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(rangeForPreset("cycle", billingCycleDay))}
        >
          Ciclo
        </Button>
        <Button
          type="button"
          variant={preset === "7d" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(rangeForPreset("7d", billingCycleDay))}
        >
          7 dias
        </Button>
        <Button
          type="button"
          variant={preset === "30d" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(rangeForPreset("30d", billingCycleDay))}
        >
          30 dias
        </Button>
        <Button
          type="button"
          variant={preset === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({})}
        >
          Tudo
        </Button>
      </div>

      {showCustom ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">De</div>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => {
                const next = e.target.value;
                setCustomFrom(next);
                onChange({
                  from: next ? dateInputToIsoStart(next) : undefined,
                  to: customTo ? dateInputToIsoEnd(customTo) : undefined,
                });
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Até</div>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => {
                const next = e.target.value;
                setCustomTo(next);
                onChange({
                  from: customFrom ? dateInputToIsoStart(customFrom) : undefined,
                  to: next ? dateInputToIsoEnd(next) : undefined,
                });
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function rangeForPreset(preset: Exclude<Preset, "all">, billingCycleDay: number) {
  const now = new Date();
  if (preset === "7d" || preset === "30d") {
    const days = preset === "7d" ? 7 : 30;
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const { from, to } = billingCycleRange(now, billingCycleDay);
  return { from: from.toISOString(), to: to.toISOString() };
}

function billingCycleRange(now: Date, cycleDay: number) {
  const currentDay = now.getDate();
  let endMonth = now.getMonth();
  let endYear = now.getFullYear();

  if (currentDay > cycleDay) {
    endMonth++;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
  }

  const endDate = new Date(endYear, endMonth, cycleDay, 23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  return { from: startDate, to: endDate };
}

function isoToDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIsoStart(value: string) {
  const [y, m, d] = value.split("-").map((p) => Number(p));
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

function dateInputToIsoEnd(value: string) {
  const [y, m, d] = value.split("-").map((p) => Number(p));
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
}

function inferPreset(value: { from?: string; to?: string }, billingCycleDay: number): Preset {
  if (!value.from && !value.to) return "all";
  const now = new Date();
  const cycle = rangeForPreset("cycle", billingCycleDay);
  if (value.from === cycle.from && value.to === cycle.to) return "cycle";

  const days7 = rangeForPreset("7d", billingCycleDay);
  if (value.from && value.to && roughlySameRange(value.from, value.to, days7.from, days7.to)) return "7d";

  const days30 = rangeForPreset("30d", billingCycleDay);
  if (value.from && value.to && roughlySameRange(value.from, value.to, days30.from, days30.to)) return "30d";

  // Avoid unused var warning in some configs
  void now;
  return "all";
}

function roughlySameRange(aFrom: string, aTo: string, bFrom: string, bTo: string) {
  const a1 = new Date(aFrom).getTime();
  const a2 = new Date(aTo).getTime();
  const b1 = new Date(bFrom).getTime();
  const b2 = new Date(bTo).getTime();
  if ([a1, a2, b1, b2].some((x) => Number.isNaN(x))) return false;
  const toleranceMs = 5 * 60 * 1000;
  return Math.abs(a1 - b1) < toleranceMs && Math.abs(a2 - b2) < toleranceMs;
}


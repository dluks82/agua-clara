import type { Reading } from "@/db/schema";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";

function makeReading(overrides: Partial<Reading>): Reading {
  return {
    id: overrides.id ?? 1,
    tenant_id: overrides.tenant_id ?? "t_1",
    ts: overrides.ts ?? new Date("2025-01-01T00:00:00.000Z"),
    hydrometer_m3: overrides.hydrometer_m3 ?? "0.000",
    horimeter_h: overrides.horimeter_h ?? "0.000",
    notes: overrides.notes ?? null,
    hydrometer_status: overrides.hydrometer_status ?? "regular",
    horimeter_status: overrides.horimeter_status ?? "regular",
    hydrometer_final_old: overrides.hydrometer_final_old ?? null,
    hydrometer_initial_new: overrides.hydrometer_initial_new ?? null,
    horimeter_final_old: overrides.horimeter_final_old ?? null,
    horimeter_initial_new: overrides.horimeter_initial_new ?? null,
  };
}

describe("calculateIntervals", () => {
  it("sorts by timestamp and calculates regular deltas", () => {
    const r1 = makeReading({
      id: 1,
      ts: new Date("2025-01-01T00:00:00.000Z"),
      hydrometer_m3: "10.000",
      horimeter_h: "5.000",
    });
    const r2 = makeReading({
      id: 2,
      ts: new Date("2025-01-02T00:00:00.000Z"),
      hydrometer_m3: "20.000",
      horimeter_h: "7.000",
    });

    const intervals = calculateIntervals([r2, r1]); // intentionally unsorted
    expect(intervals).toHaveLength(1);
    expect(intervals[0]?.delta_v).toBe(10);
    expect(intervals[0]?.delta_h).toBe(2);
    expect(intervals[0]?.q_m3h).toBeCloseTo(5, 6);
    expect(intervals[0]?.confidence).toBe("ALTA");
  });

  it("handles rollover deltas", () => {
    const r1 = makeReading({
      id: 1,
      ts: new Date("2025-01-01T00:00:00.000Z"),
      hydrometer_m3: "998.000",
      horimeter_h: "100.000",
    });
    const r2 = makeReading({
      id: 2,
      ts: new Date("2025-01-01T01:00:00.000Z"),
      hydrometer_m3: "3.000",
      horimeter_h: "101.000",
      hydrometer_status: "rollover",
    });

    const intervals = calculateIntervals([r1, r2]);
    expect(intervals[0]?.delta_v).toBe(5);
  });

  it("handles exchange deltas", () => {
    const r1 = makeReading({
      id: 1,
      ts: new Date("2025-01-01T00:00:00.000Z"),
      hydrometer_m3: "900.000",
      horimeter_h: "10.000",
    });
    const r2 = makeReading({
      id: 2,
      ts: new Date("2025-01-02T00:00:00.000Z"),
      hydrometer_m3: "20.000",
      horimeter_h: "12.000",
      hydrometer_status: "exchange",
      hydrometer_final_old: "950.000",
      hydrometer_initial_new: "10.000",
    });

    const intervals = calculateIntervals([r1, r2]);
    expect(intervals[0]?.delta_v).toBe(60);
  });

  it("marks low confidence for short operating time", () => {
    const r1 = makeReading({
      id: 1,
      ts: new Date("2025-01-01T00:00:00.000Z"),
      hydrometer_m3: "0.000",
      horimeter_h: "0.000",
    });
    const r2 = makeReading({
      id: 2,
      ts: new Date("2025-01-01T00:30:00.000Z"),
      hydrometer_m3: "1.000",
      horimeter_h: "0.500",
    });

    const intervals = calculateIntervals([r1, r2]);
    expect(intervals[0]?.confidence).toBe("BAIXA");
  });
});

describe("calculateKPIs", () => {
  it("returns zeros/nulls with no intervals", () => {
    const kpis = calculateKPIs([]);
    expect(kpis.producao_total_m3).toBe(0);
    expect(kpis.horas_total_h).toBe(0);
    expect(kpis.q_avg_m3h).toBeNull();
    expect(kpis.utilization_rate_pct).toBeNull();
  });

  it("computes weighted average flow and utilization", () => {
    const readings: Reading[] = [
      makeReading({
        id: 1,
        ts: new Date("2025-01-01T00:00:00.000Z"),
        hydrometer_m3: "0.000",
        horimeter_h: "0.000",
      }),
      makeReading({
        id: 2,
        ts: new Date("2025-01-01T02:00:00.000Z"),
        hydrometer_m3: "10.000",
        horimeter_h: "1.000",
      }),
    ];

    const intervals = calculateIntervals(readings);
    const kpis = calculateKPIs(intervals);
    expect(kpis.producao_total_m3).toBe(10);
    expect(kpis.horas_total_h).toBe(1);
    expect(kpis.q_avg_m3h).toBeCloseTo(10, 6);
    expect(kpis.utilization_rate_pct).toBeCloseTo(50, 6); // 1h operating over 2h elapsed
  });
});


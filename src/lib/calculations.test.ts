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

  it("computes weighted COV using delta_h as weight", () => {
    // Two intervals with different durations but same flow → COV should be 0
    const intervals = [
      { start: "2025-01-01T00:00:00.000Z", end: "2025-01-02T00:00:00.000Z", delta_v: 80, delta_h: 10, q_m3h: 8, l_min: 133.3, l_s: 2.22, confidence: "ALTA" as const },
      { start: "2025-01-02T00:00:00.000Z", end: "2025-01-04T00:00:00.000Z", delta_v: 160, delta_h: 20, q_m3h: 8, l_min: 133.3, l_s: 2.22, confidence: "ALTA" as const },
    ];
    const kpis = calculateKPIs(intervals);
    expect(kpis.cov_q_pct).toBeCloseTo(0, 6);
  });

  it("weighted COV gives more weight to longer intervals", () => {
    // Short interval (1h) with very different Q, long interval (50h) with normal Q
    // Weighted COV should be LOWER than arithmetic COV because the outlier has little weight
    const intervals = [
      { start: "2025-01-01T00:00:00.000Z", end: "2025-01-01T01:00:00.000Z", delta_v: 20, delta_h: 1, q_m3h: 20, l_min: 333.3, l_s: 5.56, confidence: "ALTA" as const },
      { start: "2025-01-01T01:00:00.000Z", end: "2025-01-03T03:00:00.000Z", delta_v: 400, delta_h: 50, q_m3h: 8, l_min: 133.3, l_s: 2.22, confidence: "ALTA" as const },
    ];
    const kpis = calculateKPIs(intervals);

    // Weighted avg = 420/51 ≈ 8.235
    // Arithmetic avg = (20+8)/2 = 14
    // Weighted COV should be much smaller than arithmetic COV
    expect(kpis.q_avg_m3h).toBeCloseTo(420 / 51, 2);
    expect(kpis.cov_q_pct).toBeLessThan(30); // Weighted: small outlier impact
    // An arithmetic COV would be ~60%+, weighted should be much less
  });

  it("ignores negative delta_v in production total", () => {
    // Negative delta_v (data entry error) should not reduce total production
    const intervals = [
      { start: "2025-01-01T00:00:00.000Z", end: "2025-01-02T00:00:00.000Z", delta_v: 100, delta_h: 10, q_m3h: 10, l_min: 166.7, l_s: 2.78, confidence: "ALTA" as const },
      { start: "2025-01-02T00:00:00.000Z", end: "2025-01-03T00:00:00.000Z", delta_v: -5, delta_h: 8, q_m3h: null, l_min: null, l_s: null, confidence: "ALTA" as const },
      { start: "2025-01-03T00:00:00.000Z", end: "2025-01-04T00:00:00.000Z", delta_v: 80, delta_h: 9, q_m3h: 8.89, l_min: 148.1, l_s: 2.47, confidence: "ALTA" as const },
    ];
    const kpis = calculateKPIs(intervals);
    expect(kpis.producao_total_m3).toBe(180); // 100 + 0 + 80, ignoring -5
  });
});

describe("calculateIntervals — negative delta detection", () => {
  it("allows negative delta_v for regular status (data entry error)", () => {
    const r1 = makeReading({
      id: 1,
      ts: new Date("2025-01-01T00:00:00.000Z"),
      hydrometer_m3: "100.000",
      horimeter_h: "10.000",
    });
    const r2 = makeReading({
      id: 2,
      ts: new Date("2025-01-02T00:00:00.000Z"),
      hydrometer_m3: "90.000", // Typed wrong — should have been 190
      horimeter_h: "18.000",
    });

    const intervals = calculateIntervals([r1, r2]);
    expect(intervals[0]?.delta_v).toBe(-10); // Negative flows through for alert detection
    expect(intervals[0]?.q_m3h).toBeNull(); // No flow calculated for negative delta
  });

  it("still clamps rollover deltas to 0", () => {
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
    expect(intervals[0]?.delta_v).toBeGreaterThanOrEqual(0); // Rollover is always >= 0
  });
});


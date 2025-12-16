import { getIntervalsSchema, intervalSchema, kpisSchema } from "@/lib/validations/intervals";

describe("getIntervalsSchema", () => {
  it("accepts valid range with offset", () => {
    const result = getIntervalsSchema.parse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-02T00:00:00.000Z",
    });
    expect(result.from).toContain("Z");
  });

  it("rejects invalid ISO date", () => {
    expect(() => getIntervalsSchema.parse({ from: "2025-01-01", to: null })).toThrow();
  });
});

describe("intervalSchema / kpisSchema", () => {
  it("validates interval shape", () => {
    const interval = intervalSchema.parse({
      start: "2025-01-01T00:00:00.000Z",
      end: "2025-01-01T01:00:00.000Z",
      delta_v: 10,
      delta_h: 2,
      q_m3h: 5,
      l_min: 83.33,
      l_s: 1.388,
      confidence: "ALTA",
    });
    expect(interval.delta_v).toBe(10);
  });

  it("validates KPI defaults/nullables", () => {
    const kpis = kpisSchema.parse({
      producao_total_m3: 0,
      horas_total_h: 0,
      q_avg_m3h: null,
      q_avg_lmin: null,
      q_avg_ls: null,
      cov_q_pct: null,
      utilization_rate_pct: null,
    });
    expect(kpis.q_avg_m3h).toBeNull();
  });
});


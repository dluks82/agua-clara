import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => ({ db }));
vi.mock("@/lib/alerts", () => ({
  detectAlerts: () => [],
  calculateBaseline: () => null,
}));

import { getDashboardData } from "@/lib/data";

describe("getDashboardData", () => {
  beforeEach(() => {
    db.execute.mockReset();
    db.select.mockReset();
  });

  it("adds pro-rata virtual readings at period boundaries when needed", async () => {
    const period = {
      from: new Date("2025-01-01T00:00:00.000Z"),
      to: new Date("2025-01-31T23:59:59.999Z"),
    };

    db.execute.mockResolvedValue([
      {
        id: 10,
        tenant_id: "t1",
        ts: new Date("2024-12-31T00:00:00.000Z"),
        hydrometer_m3: "0.000",
        horimeter_h: "0.000",
        notes: null,
        hydrometer_status: "regular",
        horimeter_status: "regular",
        hydrometer_final_old: null,
        hydrometer_initial_new: null,
        horimeter_final_old: null,
        horimeter_initial_new: null,
      },
      {
        id: 11,
        tenant_id: "t1",
        ts: new Date("2025-01-10T00:00:00.000Z"),
        hydrometer_m3: "10.000",
        horimeter_h: "1.000",
        notes: null,
        hydrometer_status: "regular",
        horimeter_status: "regular",
        hydrometer_final_old: null,
        hydrometer_initial_new: null,
        horimeter_final_old: null,
        horimeter_initial_new: null,
      },
      {
        id: 12,
        tenant_id: "t1",
        ts: new Date("2025-02-10T00:00:00.000Z"),
        hydrometer_m3: "20.000",
        horimeter_h: "2.000",
        notes: null,
        hydrometer_status: "regular",
        horimeter_status: "regular",
        hydrometer_final_old: null,
        hydrometer_initial_new: null,
        horimeter_final_old: null,
        horimeter_initial_new: null,
      },
    ]);

    db.select.mockReturnValue({
      from: () => ({
        where: async () => [],
      }),
    });

    const result = await getDashboardData("t1", period);

    const virtuals = result.readings.filter((r) => r.id === -1);
    expect(virtuals).toHaveLength(2);
    expect(virtuals[0]?.notes).toBe("Leitura Virtual (Pro-Rata)");
    expect(virtuals[1]?.notes).toBe("Leitura Virtual (Pro-Rata)");

    const byTs = [...result.readings].sort((a, b) => a.ts.getTime() - b.ts.getTime());
    expect(byTs[0]?.ts.toISOString()).toBe(period.from.toISOString());
    expect(byTs[byTs.length - 1]?.ts.toISOString()).toBe(period.to.toISOString());
  });
});

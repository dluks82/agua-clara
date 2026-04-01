import { calculateDataQuality } from "@/lib/data-quality";
import type { Interval } from "@/lib/validations/intervals";

function makeInterval(overrides: Partial<Interval>): Interval {
  return {
    start: overrides.start ?? "2025-01-01T00:00:00.000Z",
    end: overrides.end ?? "2025-01-04T00:00:00.000Z",
    delta_v: overrides.delta_v ?? 30,
    delta_h: overrides.delta_h ?? 10,
    q_m3h: overrides.q_m3h ?? 3,
    l_min: overrides.l_min ?? 50,
    l_s: overrides.l_s ?? 0.83,
    confidence: overrides.confidence ?? "ALTA",
  };
}

describe("calculateDataQuality", () => {
  const periodFrom = new Date("2025-01-01T00:00:00.000Z");
  const periodTo = new Date("2025-01-31T00:00:00.000Z");

  it("returns null for empty intervals", () => {
    expect(calculateDataQuality([], periodFrom, periodTo)).toBeNull();
  });

  it("returns high score for frequent, regular readings with full coverage", () => {
    // 10 intervals of ~3 days each — ideal scenario
    const intervals: Interval[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(periodFrom);
      start.setDate(start.getDate() + i * 3);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      intervals.push(
        makeInterval({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      );
    }

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.level).toBe("ALTA");
    expect(result!.score).toBeGreaterThanOrEqual(70);
    expect(result!.factors.frequency.score).toBeGreaterThanOrEqual(80);
    expect(result!.factors.regularity.score).toBeGreaterThanOrEqual(80);
    expect(result!.factors.gaps.gapCount).toBe(0);
  });

  it("returns low score for infrequent readings", () => {
    // Single long interval spanning most of the period
    const intervals = [
      makeInterval({
        start: "2025-01-01T00:00:00.000Z",
        end: "2025-01-25T00:00:00.000Z",
      }),
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.factors.frequency.avgDaysBetweenReadings).toBe(24);
    expect(result!.factors.frequency.score).toBe(0); // Way beyond MAX_INTERVAL_DAYS
  });

  it("penalizes irregular intervals (high std dev)", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-02T00:00:00.000Z" }), // 1 day
      makeInterval({ start: "2025-01-02T00:00:00.000Z", end: "2025-01-10T00:00:00.000Z" }), // 8 days
      makeInterval({ start: "2025-01-10T00:00:00.000Z", end: "2025-01-11T00:00:00.000Z" }), // 1 day
      makeInterval({ start: "2025-01-11T00:00:00.000Z", end: "2025-01-20T00:00:00.000Z" }), // 9 days
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.factors.regularity.stdDevDays).toBeGreaterThan(3);
    expect(result!.factors.regularity.score).toBeLessThan(50);
  });

  it("gives perfect regularity for single interval", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-04T00:00:00.000Z" }),
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.factors.regularity.score).toBe(100);
    expect(result!.factors.regularity.stdDevDays).toBe(0);
  });

  it("detects gaps above threshold", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-03T00:00:00.000Z" }), // 2 days — ok
      makeInterval({ start: "2025-01-03T00:00:00.000Z", end: "2025-01-13T00:00:00.000Z" }), // 10 days — gap!
      makeInterval({ start: "2025-01-13T00:00:00.000Z", end: "2025-01-23T00:00:00.000Z" }), // 10 days — gap!
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo, 7);
    expect(result).not.toBeNull();
    expect(result!.factors.gaps.gapCount).toBe(2);
    expect(result!.factors.gaps.score).toBeLessThan(50);
  });

  it("coverage reflects how much of the period is covered", () => {
    // Only 10 days covered out of 30
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-06T00:00:00.000Z" }), // 5 days
      makeInterval({ start: "2025-01-06T00:00:00.000Z", end: "2025-01-11T00:00:00.000Z" }), // 5 days
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.factors.coverage.coveredDays).toBeCloseTo(10, 0);
    expect(result!.factors.coverage.totalDays).toBe(30);
    expect(result!.factors.coverage.score).toBeLessThan(40);
  });

  it("composite score is weighted correctly", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-04T00:00:00.000Z" }),
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();

    // Verify composite = weighted sum of factor scores
    const expected = Math.round(
      result!.factors.frequency.score * 0.4 +
      result!.factors.regularity.score * 0.25 +
      result!.factors.coverage.score * 0.2 +
      result!.factors.gaps.score * 0.15,
    );
    expect(result!.score).toBe(expected);
  });

  it("maps score to correct levels", () => {
    // High frequency, full coverage → ALTA
    const manyIntervals: Interval[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(periodFrom);
      start.setDate(start.getDate() + i * 3);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      manyIntervals.push(makeInterval({ start: start.toISOString(), end: end.toISOString() }));
    }
    const alta = calculateDataQuality(manyIntervals, periodFrom, periodTo);
    expect(alta!.level).toBe("ALTA");

    // Single very long interval → BAIXA or MÉDIA (regularity is 100 for single interval)
    const low = calculateDataQuality(
      [makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-25T00:00:00.000Z" })],
      periodFrom,
      periodTo,
    );
    expect(low!.score).toBeLessThan(70); // Not ALTA
    expect(["BAIXA", "MÉDIA"]).toContain(low!.level);
  });

  it("includes recommendations when scores are low", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-25T00:00:00.000Z" }),
    ];

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.recommendations.length).toBeGreaterThan(0);
    // Should recommend more frequent readings
    expect(result!.recommendations.some((r) => r.includes("Registre"))).toBe(true);
  });

  it("includes positive recommendation when all scores are good", () => {
    const intervals: Interval[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(periodFrom);
      start.setDate(start.getDate() + i * 3);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      intervals.push(makeInterval({ start: start.toISOString(), end: end.toISOString() }));
    }

    const result = calculateDataQuality(intervals, periodFrom, periodTo);
    expect(result).not.toBeNull();
    expect(result!.recommendations.some((r) => r.includes("boa"))).toBe(true);
  });

  it("respects custom gap threshold", () => {
    const intervals = [
      makeInterval({ start: "2025-01-01T00:00:00.000Z", end: "2025-01-06T00:00:00.000Z" }), // 5 days
    ];

    // With 7-day threshold, 5 days is not a gap
    const result7 = calculateDataQuality(intervals, periodFrom, periodTo, 7);
    expect(result7!.factors.gaps.gapCount).toBe(0);

    // With 4-day threshold, 5 days IS a gap
    const result4 = calculateDataQuality(intervals, periodFrom, periodTo, 4);
    expect(result4!.factors.gaps.gapCount).toBe(1);
  });
});

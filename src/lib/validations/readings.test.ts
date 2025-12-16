import { createReadingSchema, getReadingsSchema } from "@/lib/validations/readings";

describe("createReadingSchema", () => {
  it("accepts ISO timestamps and optional notes", () => {
    const result = createReadingSchema.parse({
      ts: "2025-01-01T00:00:00.000Z",
      hydrometer_m3: 1,
      horimeter_h: 2,
      notes: "ok",
      hydrometer_status: "regular",
      horimeter_status: "regular",
    });
    expect(result.notes).toBe("ok");
  });

  it("treats null notes as undefined", () => {
    const result = createReadingSchema.parse({
      ts: "2025-01-01T00:00:00.000Z",
      hydrometer_m3: 1,
      horimeter_h: 2,
      notes: null,
      hydrometer_status: "regular",
      horimeter_status: "regular",
    });
    expect(result.notes).toBeUndefined();
  });

  it("rejects invalid timestamps", () => {
    expect(() =>
      createReadingSchema.parse({
        ts: "not-a-date",
        hydrometer_m3: 1,
        horimeter_h: 2,
        hydrometer_status: "regular",
        horimeter_status: "regular",
      })
    ).toThrow();
  });
});

describe("getReadingsSchema", () => {
  it("coerces page/limit defaults", () => {
    const result = getReadingsSchema.parse({ from: null, to: null, page: "", limit: "" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("accepts ISO with offset for from/to", () => {
    const result = getReadingsSchema.parse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-02T00:00:00.000Z",
      page: "2",
      limit: "50",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });
});


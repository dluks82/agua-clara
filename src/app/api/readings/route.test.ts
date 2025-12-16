import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeNextRequest } from "@/test/utils";

const requireTenantRole = vi.fn();
const revalidateTag = vi.fn();

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function makeDbMock() {
  const db: DbMock = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return db;
}

vi.mock("@/lib/api-rbac", () => ({ requireTenantRole }));
vi.mock("next/cache", () => ({ revalidateTag }));

describe("/api/readings route handlers", () => {
  beforeEach(() => {
    requireTenantRole.mockReset();
    revalidateTag.mockReset();
    vi.resetModules();
  });

  it("POST accepts notes=null and inserts with notes undefined", async () => {
    const db = makeDbMock();
    const insertValues = vi.fn();

    db.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [],
          }),
        }),
      }),
    });

    db.insert.mockReturnValue({
      values: (vals: unknown) => {
        insertValues(vals);
        return { returning: async () => [{ id: 123 }] };
      },
    });

    vi.doMock("@/db", () => ({ db }));
    requireTenantRole.mockResolvedValue({ tenantId: "t1", role: "operator" });

    const { POST } = await import("./route");

    const req = makeNextRequest("http://localhost/api/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ts: "2025-01-01T00:00:00.000Z",
        hydrometer_m3: 1,
        horimeter_h: 2,
        notes: null,
        hydrometer_status: "regular",
        horimeter_status: "regular",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload).toEqual({ id: 123 });

    expect(insertValues).toHaveBeenCalledTimes(1);
    const inserted = insertValues.mock.calls[0]?.[0] as { tenant_id?: string; notes?: unknown };
    expect(inserted.tenant_id).toBe("t1");
    expect(inserted.notes).toBeUndefined();
    expect(revalidateTag).toHaveBeenCalledWith("dashboard:t1");
  });

  it("POST rejects timestamp older than last reading", async () => {
    const db = makeDbMock();
    const insertValues = vi.fn();

    db.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [
              {
                ts: new Date("2025-01-02T00:00:00.000Z"),
                hydrometer_m3: "10.000",
                horimeter_h: "10.000",
              },
            ],
          }),
        }),
      }),
    });

    db.insert.mockReturnValue({
      values: (vals: unknown) => {
        insertValues(vals);
        return { returning: async () => [{ id: 1 }] };
      },
    });

    vi.doMock("@/db", () => ({ db }));
    requireTenantRole.mockResolvedValue({ tenantId: "t1", role: "operator" });

    const { POST } = await import("./route");

    const req = makeNextRequest("http://localhost/api/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ts: "2025-01-01T00:00:00.000Z",
        hydrometer_m3: 11,
        horimeter_h: 11,
        hydrometer_status: "regular",
        horimeter_status: "regular",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toMatch(/Timestamp deve ser maior/i);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("GET returns items and total", async () => {
    const db = makeDbMock();

    db.select.mockImplementation((arg?: unknown) => {
      if (typeof arg === "object" && arg !== null && "count" in arg) {
        return {
          from: () => ({
            where: async () => [{ count: 2 }],
          }),
        };
      }
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: async () => [
                  { id: 1, tenant_id: "t1", ts: new Date("2025-01-01T00:00:00.000Z"), hydrometer_m3: "1.000", horimeter_h: "1.000", notes: null, hydrometer_status: "regular", horimeter_status: "regular", hydrometer_final_old: null, hydrometer_initial_new: null, horimeter_final_old: null, horimeter_initial_new: null },
                  { id: 2, tenant_id: "t1", ts: new Date("2025-01-02T00:00:00.000Z"), hydrometer_m3: "2.000", horimeter_h: "2.000", notes: null, hydrometer_status: "regular", horimeter_status: "regular", hydrometer_final_old: null, hydrometer_initial_new: null, horimeter_final_old: null, horimeter_initial_new: null },
                ],
              }),
            }),
          }),
        }),
      };
    });

    vi.doMock("@/db", () => ({ db }));
    requireTenantRole.mockResolvedValue({ tenantId: "t1", role: "viewer" });

    const { GET } = await import("./route");

    const req = makeNextRequest("http://localhost/api/readings?page=1&limit=20");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.total).toBe(2);
    expect(payload.items).toHaveLength(2);
    expect(payload.page).toBe(1);
  });
});

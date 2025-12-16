import { hasRole } from "@/lib/rbac";

describe("hasRole", () => {
  it("allows same role", () => {
    expect(hasRole("admin", "admin")).toBe(true);
  });

  it("allows higher role", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("admin", "viewer")).toBe(true);
  });

  it("denies lower role", () => {
    expect(hasRole("viewer", "operator")).toBe(false);
    expect(hasRole("operator", "admin")).toBe(false);
  });
});


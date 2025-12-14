export type Role = "viewer" | "operator" | "admin" | "owner";

const roleRank: Record<Role, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(role: Role, required: Role): boolean {
  return roleRank[role] >= roleRank[required];
}


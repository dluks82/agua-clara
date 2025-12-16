import { decryptPublicToken, encryptPublicToken, generatePublicToken, hashPublicToken } from "@/lib/public-dashboard";

describe("public dashboard tokens", () => {
  it("hashes tokens deterministically", () => {
    expect(hashPublicToken("abc")).toBe(hashPublicToken("abc"));
    expect(hashPublicToken("abc")).not.toBe(hashPublicToken("abcd"));
  });

  it("encrypts and decrypts tokens", () => {
    const token = "token_example";
    const enc = encryptPublicToken(token);
    expect(decryptPublicToken(enc)).toBe(token);
  });

  it("returns null for invalid encrypted payloads", () => {
    expect(decryptPublicToken("invalid")).toBeNull();
    expect(decryptPublicToken("a.b")).toBeNull();
  });

  it("generates random-looking tokens", () => {
    const t1 = generatePublicToken();
    const t2 = generatePublicToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThan(20);
  });
});


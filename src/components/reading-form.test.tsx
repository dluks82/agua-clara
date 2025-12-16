import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReadingForm } from "@/components/reading-form";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ReadingForm", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits without notes field when empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    render(<ReadingForm embedded />);

    fireEvent.change(screen.getByLabelText("Leitura Atual (m³)"), { target: { value: "10.000" } });
    fireEvent.change(screen.getByLabelText("Leitura Atual (h)"), { target: { value: "2.000" } });

    fireEvent.click(screen.getByRole("button", { name: /cadastrar leitura/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("notes");
    expect(body).toHaveProperty("hydrometer_m3", 10);
    expect(body).toHaveProperty("horimeter_h", 2);
  });

  it("shows validation error when required fields are missing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    render(<ReadingForm embedded />);

    fireEvent.click(screen.getByRole("button", { name: /cadastrar leitura/i }));

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });
});

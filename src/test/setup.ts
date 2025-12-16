import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/agua_clara";
process.env.NEXT_PUBLIC_APP_NAME ??= "Água Clara";
process.env.NEXT_PUBLIC_APP_DESCRIPTION ??= "Sistema de Monitoramento de Água";
process.env.AUTH_SECRET ??= "test_secret";
process.env.AUTH_GOOGLE_ID ??= "test_google_id";
process.env.AUTH_GOOGLE_SECRET ??= "test_google_secret";

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.ResizeObserver = ResizeObserverStub as any;
}

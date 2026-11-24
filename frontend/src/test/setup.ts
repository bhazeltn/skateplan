import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/mocks/server";
import { resetBenchmarkSetStore } from "@/mocks/benchmarkSetHandlers";
import { mockViewport } from "@/test/utils";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => mockViewport(false)); // default: desktop
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetBenchmarkSetStore();
  localStorage.clear();
});
afterAll(() => server.close());

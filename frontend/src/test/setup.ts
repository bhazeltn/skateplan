import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/mocks/server";
import { resetBenchmarkSetStore } from "@/mocks/benchmarkSetHandlers";
import { resetYtpStore } from "@/mocks/ytpHandlers";
import { resetTrainingStore } from "@/mocks/trainingHandlers";
import { mockViewport } from "@/test/utils";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => mockViewport(false)); // default: desktop
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetBenchmarkSetStore();
  resetYtpStore();
  resetTrainingStore();
  localStorage.clear();
});
afterAll(() => server.close());

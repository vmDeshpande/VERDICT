import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { beforeEach, afterEach } from "vitest";

beforeEach(() => {
  // Reset any mocks between tests
});

afterEach(() => {
  cleanup();
});
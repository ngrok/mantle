import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Why: Testing Library registers its own cleanup only when Vitest globals are on, and they are off.
afterEach(() => {
	cleanup();
});

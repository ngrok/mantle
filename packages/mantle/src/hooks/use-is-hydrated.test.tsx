import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { useIsHydrated } from "./use-is-hydrated.js";

function Probe() {
	const isHydrated = useIsHydrated();
	return <span>{String(isHydrated)}</span>;
}

describe("useIsHydrated", () => {
	test("returns true on the client", () => {
		const { result } = renderHook(() => useIsHydrated());

		expect(result.current).toBe(true);
	});

	test("returns false during server rendering", () => {
		const html = renderToString(<Probe />);

		expect(html).toContain("false");
	});
});

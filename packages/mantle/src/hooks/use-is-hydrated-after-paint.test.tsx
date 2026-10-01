import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { useIsHydratedAfterPaint } from "./use-is-hydrated-after-paint.js";

function Probe() {
	const isHydrated = useIsHydratedAfterPaint();
	return <span>{String(isHydrated)}</span>;
}

describe("useIsHydratedAfterPaint", () => {
	test("returns false during server rendering", () => {
		const html = renderToString(<Probe />);

		expect(html).toContain("false");
	});

	test("returns false in the mount commit and true after the next frame", async () => {
		render(<Probe />);

		// Why the first read: a hook that flips in the mount commit lands in the
		// same commit as a store correction, which is the case this hook exists for.
		expect(screen.getByText("false")).toBeInTheDocument();
		expect(await screen.findByText("true")).toBeInTheDocument();
	});
});

import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { expect, test } from "vitest";
import { useFocusTrap } from "./use-focus-trap.js";

/**
 * A region that is `visibility: hidden` while closed, the way a panel with a
 * `visibility` transition is in the commit that opens it. Only a real engine
 * refuses focus on a hidden element, so happy-dom cannot see this branch.
 */
function Region({ open }: { open: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	useFocusTrap(ref, { active: open });
	return (
		<>
			<button type="button">outside</button>
			<div ref={ref} style={{ visibility: open ? "visible" : "hidden" }}>
				<button type="button">inside</button>
			</div>
		</>
	);
}

test("moves focus inside once the region becomes visible after activation", async () => {
	const { rerender } = render(<Region open={false} />);
	screen.getByRole("button", { name: "outside" }).focus();
	// Why hidden on activation: the trap turns on in the same render that
	// starts the reveal, so its first attempt finds nothing it can focus.
	rerender(<Region open />);
	await expect.poll(() => document.activeElement?.textContent).toBe("inside");
});

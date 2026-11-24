import { expect, test } from "vitest";

// A class string in a module follows the same map as one in JSX.
export const rowClassName = [
	"data-open:text-strong data-open:bg-neutral-500/15",
	"data-selected:bg-selected data-indeterminate:animate-pulse",
	"data-[validation=warning]:border-warning-600 data-[side=left]:mr-2",
].join(" ");

test("presence-only state", () => {
	expect(panel).toHaveAttribute("data-open");
	expect(panel).not.toHaveAttribute("data-open");
	expect(sidebar).toHaveAttribute("data-expanded");
	expect(sidebar).not.toHaveAttribute("data-expanded");
});

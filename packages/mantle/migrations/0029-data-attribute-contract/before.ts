import { expect, test } from "vitest";

// A class string in a module follows the same map as one in JSX.
export const rowClassName = [
	"data-state-open:text-strong data-state-open:bg-neutral-500/15",
	"data-state-selected:bg-selected data-state-indeterminate:animate-pulse",
	"data-validation-warning:border-warning-600 data-side-left:mr-2",
].join(" ");

test("presence-only state", () => {
	expect(panel).toHaveAttribute("data-state", "open");
	expect(panel).toHaveAttribute("data-state", "closed");
	expect(sidebar).toHaveAttribute("data-state", "expanded");
	expect(sidebar).toHaveAttribute("data-state", "collapsed");
});

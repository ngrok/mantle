// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { StatusExample } from "~/docs/components/ai/tool-call.examples";

test("each tool-call state opens its own details", async () => {
	const user = userEvent.setup();
	render(<StatusExample />);
	const triggers = screen.getAllByRole("button");
	expect(triggers).toHaveLength(5);
	for (const trigger of triggers) {
		const target = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
		expect(target).not.toBeNull();
		expect(target?.textContent?.trim().length).toBeGreaterThan(0);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		await user.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(target?.hasAttribute("inert")).toBe(false);
	}
});

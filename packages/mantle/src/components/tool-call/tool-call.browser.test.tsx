import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { commands, page, server, userEvent } from "vitest/browser";
import * as ToolCall from "./tool-call-parts.js";

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

test("the running pulse stops when reduced motion is requested", async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
	// Why compiled CSS: the browser project loads no Tailwind stylesheet.
	const css = await commands.tailwindCss("./tool-call.tsx");
	render(
		<>
			<style>{css}</style>
			<ToolCall.Root status="running">
				<ToolCall.Trigger>
					<ToolCall.Name>list_endpoints</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>Waiting for the endpoints.</ToolCall.Content>
			</ToolCall.Root>
		</>,
	);
	const trigger = screen.getByRole("button", { name: "list_endpoints Running" });
	await expect.poll(() => trigger.getAnimations({ subtree: true }).length).toBe(1);

	await commands.emulateMedia({ reducedMotion: "reduce" });

	await expect.poll(() => trigger.getAnimations({ subtree: true }).length).toBe(0);
});

describe("the caret", () => {
	/** The caret's opacity. Poll it: a 200ms transition moves it. */
	function caretOpacity() {
		const caret = document.querySelector('[data-slot~="accordion-trigger-icon"]');
		return caret && getComputedStyle(caret).opacity;
	}

	async function renderCall() {
		// Why compiled CSS: the browser project loads no Tailwind stylesheet.
		const css = await commands.tailwindCss("./tool-call.tsx");
		render(
			<>
				<style>{css}</style>
				<button type="button">Before</button>
				<ToolCall.Root status="done">
					<ToolCall.Trigger>
						<ToolCall.Name>list_endpoints</ToolCall.Name>
					</ToolCall.Trigger>
					<ToolCall.Content>Found 5 endpoints.</ToolCall.Content>
				</ToolCall.Root>
			</>,
		);
		return page.getByRole("button", { name: "list_endpoints Done" });
	}

	test("shows on hover, keyboard focus, and open, and hides at rest", async () => {
		const trigger = await renderCall();
		await expect.poll(caretOpacity).toBe("0");

		await userEvent.hover(trigger);
		await expect.poll(caretOpacity).toBe("1");
		await userEvent.unhover(trigger);
		await expect.poll(caretOpacity).toBe("0");

		await userEvent.click(page.getByRole("button", { name: "Before" }));
		await userEvent.tab();
		await expect.poll(caretOpacity).toBe("1");

		await userEvent.click(trigger);
		await userEvent.click(page.getByRole("button", { name: "Before" }));
		await expect.poll(caretOpacity).toBe("1");
	});

	test.runIf(server.browser === "chromium")("always shows on a touch screen", async () => {
		await commands.emulateMedia({ hover: "none" });
		try {
			await renderCall();
			await expect.poll(caretOpacity).toBe("1");
		} finally {
			await commands.emulateMedia({ hover: "hover" });
		}
	});
});

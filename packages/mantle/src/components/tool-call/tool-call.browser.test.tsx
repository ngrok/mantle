import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { commands } from "vitest/browser";
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

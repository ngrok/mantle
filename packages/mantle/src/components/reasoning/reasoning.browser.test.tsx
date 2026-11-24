import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Reasoning from "./reasoning-parts.js";

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

test("the streaming pulse stops when reduced motion is requested", async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
	// Why compiled CSS: the browser project loads no Tailwind stylesheet.
	const css = await commands.tailwindCss("./reasoning.tsx");
	render(
		<>
			<style>{css}</style>
			<Reasoning.Root streaming>
				<Reasoning.Trigger />
				<Reasoning.Content>Checking the endpoint policy.</Reasoning.Content>
			</Reasoning.Root>
		</>,
	);
	const trigger = screen.getByRole("button", { name: "Thinking…" });
	await expect.poll(() => trigger.getAnimations().length).toBe(1);

	await commands.emulateMedia({ reducedMotion: "reduce" });

	await expect.poll(() => trigger.getAnimations().length).toBe(0);
});

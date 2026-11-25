import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as Command from "./command-parts.js";

const edges = (list: Element) =>
	[list.hasAttribute("data-overflow-top"), list.hasAttribute("data-overflow-bottom")].join();

const Palette = () => (
	<Command.Root>
		<Command.Input placeholder="Search" />
		{/* Why the style: the compiled CSS holds only the classes in command.tsx. */}
		<Command.List style={{ maxHeight: 200 }}>
			<Command.Empty>No results</Command.Empty>
			<Command.Group heading="Fruits">
				{Array.from({ length: 15 }, (_, index) => (
					<Command.Item key={index} value={`apple ${index}`}>{`apple ${index}`}</Command.Item>
				))}
			</Command.Group>
			<Command.Group heading="Vegetables">
				{Array.from({ length: 15 }, (_, index) => (
					<Command.Item key={index} value={`carrot ${index}`}>{`carrot ${index}`}</Command.Item>
				))}
			</Command.Group>
		</Command.List>
	</Command.Root>
);

describe("Command.List edge cue (browser)", () => {
	let style: HTMLStyleElement;

	beforeAll(async () => {
		style = document.createElement("style");
		// Why the [hidden] rule: the compiled CSS has no preflight, and `flex` on
		// an item beats the browser's own `[hidden]` style.
		style.textContent = `${await commands.tailwindCss("./command.tsx")}\n[hidden] { display: none !important; }`;
		document.head.append(style);
	});

	afterAll(() => {
		style.remove();
	});

	test("the cue follows the query, and the active item stays clear of it", async () => {
		render(<Palette />);
		const list = screen.getByRole("listbox");
		const input = screen.getByPlaceholderText("Search");
		await expect.poll(() => edges(list)).toBe("false,true");

		await userEvent.type(input, "carrot 14");
		await expect.poll(() => edges(list)).toBe("false,false");
		await userEvent.clear(input);
		await expect.poll(() => edges(list)).toBe("false,true");

		await userEvent.type(input, "carrot");
		await userEvent.keyboard("{End}");
		await expect.poll(() => edges(list)).toBe("true,false");
		await userEvent.keyboard("{Home}");
		await expect.poll(() => edges(list)).toBe("false,true");
		for (let step = 0; step < 8; step++) {
			await userEvent.keyboard("{ArrowDown}");
		}
		// Why 24: the cue is 1.5rem tall.
		const active = list.querySelector("[data-highlighted]") as HTMLElement;
		expect(active.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			list.getBoundingClientRect().bottom - 24 + 0.5,
		);
	});

	test("a list that mounts in a hidden panel cues its edges once the panel shows", async () => {
		const Panel = () => {
			const [hidden, setHidden] = useState(true);
			return (
				<>
					<button type="button" onClick={() => setHidden(false)}>
						Show
					</button>
					<div hidden={hidden}>
						<Palette />
					</div>
				</>
			);
		};
		render(<Panel />);
		await userEvent.click(screen.getByRole("button", { name: "Show" }));
		await expect.poll(() => edges(screen.getByRole("listbox"))).toBe("false,true");
	});
});

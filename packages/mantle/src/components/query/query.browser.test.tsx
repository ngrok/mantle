import { render } from "@testing-library/react";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { testGrammar } from "../../utils/query-filter/test-grammar.js";
import * as Query from "./query-parts.js";

/** A field with the `/` shortcut, named by `label`. */
function ShortcutField({ label }: { label: string }) {
	const [value, setValue] = useState("");
	return (
		<Query.Root grammar={testGrammar} value={value} onValueChange={setValue}>
			<Query.Input keyboardShortcut aria-label={label} placeholder="Filter" />
		</Query.Root>
	);
}

/** The compound under a `useState`, with the state painted where a test can read it. */
function Host({ onValueChange }: { onValueChange?: (value: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<>
			<Query.Root
				grammar={testGrammar}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
			>
				<Query.Input
					aria-label="Filter projects"
					placeholder="Filter projects, or type a filter like name:api"
				/>
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
				</Query.Content>
			</Query.Root>
			<output aria-label="query state">{value}</output>
		</>
	);
}

describe("Query in a browser", () => {
	// A suggestion lands through `setRangeText`, which Chromium does not route
	// through React's value tracker. Without a resync, deleting back to the
	// tracked value is dropped, and the state keeps the suggestion over an empty input.
	test("hands every edit to the caller after a suggestion is accepted", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^name:/ }));
		await expect.element(input).toHaveValue("name:");

		await userEvent.clear(input);

		await expect.element(input).toHaveValue("");
		await expect.element(page.getByLabelText("query state")).toHaveTextContent("");
	});

	test("reports an accepted suggestion once", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<Host onValueChange={onValueChange} />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^name:/ }));
		await expect.element(input).toHaveValue("name:");

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("name:");
	});

	test("submits the host form on Enter unless Enter accepts an active row", async () => {
		const onSubmit = vi.fn<() => void>();
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<Host />
			</form>,
		);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.keyboard("{ArrowDown}{Enter}");
		await expect.element(input).toHaveValue("name:");
		expect(onSubmit).not.toHaveBeenCalled();

		await userEvent.keyboard("acme{Enter}");
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	// Radix reports a mouse press outside the popover after the click, when the
	// clear button is already gone. The popover must not read that as a dismiss.
	test("keeps the suggestions open after the clear button empties the query", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.keyboard("acme");
		await userEvent.click(page.getByRole("button", { name: "Clear filter" }));

		await expect.element(input).toHaveValue("");
		await expect.element(input).toHaveFocus();
		await expect.element(input).toHaveAttribute("aria-expanded", "true");
	});

	// A window listener sees the shadow host as the target, not the text field inside it.
	test("lets `/` type in a text field inside a shadow root", async () => {
		const host = document.createElement("div");
		document.body.append(host);
		const notes = document.createElement("input");
		notes.setAttribute("aria-label", "Notes");
		host.attachShadow({ mode: "open" }).append(notes);
		render(<ShortcutField label="Filter projects" />);

		notes.focus();
		await userEvent.keyboard("/");

		expect(notes).toHaveValue("/");
		await expect.element(page.getByRole("combobox", { name: "Filter projects" })).not.toHaveFocus();
		host.remove();
	});

	// happy-dom focuses both of these fields, so only a browser shows that they cannot take focus.
	test("gives `/` to a later field when earlier ones cannot take focus", async () => {
		render(
			<>
				<div hidden>
					<ShortcutField label="Hidden" />
				</div>
				<fieldset disabled>
					<ShortcutField label="Disabled" />
				</fieldset>
				<ShortcutField label="Shown" />
			</>,
		);

		await userEvent.keyboard("/");

		const shown = page.getByRole("combobox", { name: "Shown" });
		await expect.element(shown).toHaveFocus();
		await expect.element(shown).toHaveValue("");
	});

	describe("the `/` hint", () => {
		let styleElement: HTMLStyleElement;

		// Why the compiled CSS: the browser project loads no stylesheet, and CSS hides the hint.
		beforeAll(async () => {
			styleElement = document.createElement("style");
			styleElement.textContent = await commands.tailwindCss("./query.tsx");
			document.head.appendChild(styleElement);
		});

		afterAll(() => {
			styleElement.remove();
		});

		test("shows only while the field can take the key", async () => {
			render(
				<>
					<fieldset disabled>
						<ShortcutField label="Disabled" />
					</fieldset>
					<ShortcutField label="Enabled" />
				</>,
			);
			const [disabledHint, enabledHint] = document.querySelectorAll(
				'[data-slot~="query-input-shortcut"]',
			);

			expect(disabledHint).not.toBeVisible();
			expect(enabledHint).toBeVisible();

			await userEvent.keyboard("/");

			await expect.element(page.getByRole("combobox", { name: "Enabled" })).toHaveFocus();
			expect(enabledHint).not.toBeVisible();
		});
	});

	// Why the compiled CSS: the cap and the scroll are CSS. Why the box sizing: it
	// comes from Tailwind's preflight in `mantle.css`, which the compiled CSS leaves out.
	test("keeps the popover and its footer in a short viewport, and scrolls the list", async () => {
		const styleElement = document.createElement("style");
		styleElement.textContent = `${await commands.tailwindCss("./query.tsx")} *, ::before, ::after { box-sizing: border-box; }`;
		document.head.appendChild(styleElement);
		const [width, height] = [window.innerWidth, window.innerHeight];
		await page.viewport(800, 240);
		try {
			render(
				<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
					<Query.Input aria-label="Filter projects" placeholder="Filter" />
					<Query.Content>
						<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
						<Query.Footer>Footer</Query.Footer>
					</Query.Content>
				</Query.Root>,
			);
			await userEvent.click(page.getByRole("combobox", { name: "Filter projects" }));
			const list = page.getByRole("listbox").element();
			const footer = page.getByText("Footer").element();

			await expect
				.poll(() => footer.getBoundingClientRect().bottom)
				.toBeLessThanOrEqual(window.innerHeight);
			expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
		} finally {
			await page.viewport(width, height);
			styleElement.remove();
		}
	});
});

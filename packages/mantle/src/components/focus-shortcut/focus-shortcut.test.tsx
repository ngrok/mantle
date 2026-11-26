import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { testGrammar } from "../../utils/query-filter/test-grammar.js";
import * as Combobox from "../combobox/combobox-parts.js";
import { Input, InputCapture } from "../input/input.js";
import * as Query from "../query/query-parts.js";
import { TextArea } from "../text-area/text-area.js";
import * as FocusShortcut from "./focus-shortcut-parts.js";

/** A search field with the shortcut and its hint inside the chrome, the way a product composes it. */
function SearchField({
	label = "Search",
	defaultValue,
	disabled,
}: {
	label?: string;
	defaultValue?: string;
	disabled?: boolean;
}) {
	return (
		<FocusShortcut.Root>
			<Input>
				<FocusShortcut.Field>
					<InputCapture aria-label={label} defaultValue={defaultValue} disabled={disabled} />
				</FocusShortcut.Field>
				<FocusShortcut.Hint data-testid={`${label} hint`} />
			</Input>
		</FocusShortcut.Root>
	);
}

const pressSlash = (target: Element = document.body) => fireEvent.keyDown(target, { key: "/" });

describe("FocusShortcut", () => {
	test("focuses the field on `/`, names the key, and claims the event", () => {
		render(<SearchField />);
		const field = screen.getByRole("textbox", { name: "Search" });

		expect(field).toHaveAttribute("aria-keyshortcuts", "/");
		expect(pressSlash()).toBe(false);
		expect(field).toHaveFocus();
	});

	test("keeps the field's own `aria-keyshortcuts`", () => {
		render(
			<FocusShortcut.Root>
				<FocusShortcut.Field>
					<input aria-label="Search" aria-keyshortcuts="Control+K" />
				</FocusShortcut.Field>
			</FocusShortcut.Root>,
		);

		expect(screen.getByRole("textbox", { name: "Search" })).toHaveAttribute(
			"aria-keyshortcuts",
			"Control+K /",
		);
	});

	test("merges its data-slot and composes the child's ref", () => {
		const ref = createRef<HTMLTextAreaElement>();
		render(
			<FocusShortcut.Root>
				<FocusShortcut.Field>
					<TextArea aria-label="Notes" ref={ref} />
				</FocusShortcut.Field>
			</FocusShortcut.Root>,
		);
		const field = screen.getByRole("textbox", { name: "Notes" });

		expect(ref.current).toBe(field);
		expect(field.getAttribute("data-slot")?.split(" ")).toContain("focus-shortcut-field");
		pressSlash();
		expect(field).toHaveFocus();
	});

	test("leaves `/` to another text control", () => {
		render(
			<>
				<input aria-label="Notes" />
				<SearchField />
			</>,
		);
		const notes = screen.getByRole("textbox", { name: "Notes" });
		notes.focus();

		expect(pressSlash(notes)).toBe(true);
		expect(notes).toHaveFocus();
	});

	test.each([
		["Meta", { metaKey: true }],
		["Ctrl", { ctrlKey: true }],
		["Alt", { altKey: true }],
		["a key repeat", { repeat: true }],
		["an IME composition", { isComposing: true }],
	])("ignores `/` with %s", (_name, init) => {
		render(<SearchField />);

		expect(fireEvent.keyDown(document.body, { key: "/", ...init })).toBe(true);
		expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
	});

	test("ignores `/` that an earlier listener claimed", () => {
		render(<SearchField />);
		const claim = (event: KeyboardEvent) => event.preventDefault();
		document.addEventListener("keydown", claim);
		try {
			pressSlash();
		} finally {
			document.removeEventListener("keydown", claim);
		}

		expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
	});

	test("ignores `/` while the field is disabled", () => {
		render(<SearchField disabled />);

		expect(pressSlash()).toBe(true);
		expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
	});

	test("gives `/` to the first field that a modal does not hide", () => {
		render(
			<>
				<div inert>
					<SearchField label="Inert" />
				</div>
				<div aria-hidden="true">
					<SearchField label="Hidden" />
				</div>
				<SearchField label="First" />
				<SearchField label="Second" />
			</>,
		);

		pressSlash();

		expect(screen.getByRole("textbox", { name: "First" })).toHaveFocus();
	});

	test("stops listening once the field unmounts", () => {
		const { unmount } = render(<SearchField />);
		unmount();

		expect(pressSlash()).toBe(true);
	});

	describe("the hint", () => {
		test("renders a hidden `/` key on the server", () => {
			const html = renderToString(<SearchField />);
			const container = document.createElement("div");
			container.innerHTML = html;
			const hint = container.querySelector('[data-slot~="focus-shortcut-hint"]');

			expect(hint).toHaveAttribute("hidden");
			expect(hint).toHaveTextContent("/");
		});

		test("shows while the field is empty, and hides while it has focus or text", async () => {
			const user = userEvent.setup();
			render(<SearchField />);
			const field = screen.getByRole("textbox", { name: "Search" });
			const hint = screen.getByTestId("Search hint");

			expect(hint).not.toHaveAttribute("hidden");
			expect(hint).toHaveAttribute("aria-hidden", "true");
			expect(hint).toHaveAttribute("data-slot", "focus-shortcut-hint kbd");
			expect(hint).toHaveAttribute("translate", "no");

			await user.click(field);
			expect(hint).toHaveAttribute("hidden");

			await user.keyboard("acme");
			act(() => field.blur());
			expect(hint).toHaveAttribute("hidden");

			await user.clear(field);
			act(() => field.blur());
			expect(hint).not.toHaveAttribute("hidden");
		});

		test("hides while the field starts with a value or is disabled", () => {
			render(
				<>
					<SearchField label="Filled" defaultValue="acme" />
					<SearchField label="Disabled" disabled />
				</>,
			);

			expect(screen.getByTestId("Filled hint")).toHaveAttribute("hidden");
			expect(screen.getByTestId("Disabled hint")).toHaveAttribute("hidden");
		});

		test("follows a value that the app sets with no DOM event", async () => {
			function Controlled() {
				const [value, setValue] = useState("acme");
				return (
					<>
						<button type="button" onClick={() => setValue("")}>
							Reset
						</button>
						<FocusShortcut.Root>
							<FocusShortcut.Field>
								<input
									aria-label="Search"
									value={value}
									onChange={(event) => setValue(event.target.value)}
								/>
							</FocusShortcut.Field>
							<FocusShortcut.Hint data-testid="hint" />
						</FocusShortcut.Root>
					</>
				);
			}
			const user = userEvent.setup();
			render(<Controlled />);
			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");

			await user.click(screen.getByRole("button", { name: "Reset" }));

			expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden");
		});

		test("merges its props onto its child with asChild", () => {
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<input aria-label="Search" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint asChild className="ms-auto" data-testid="hint">
						<span className="text-muted" data-slot="custom">
							/
						</span>
					</FocusShortcut.Hint>
				</FocusShortcut.Root>,
			);
			const hint = screen.getByTestId("hint");

			expect(hint.tagName).toBe("SPAN");
			expect(hint).toHaveClass("ms-auto", "text-muted");
			expect(hint).toHaveAttribute("data-slot", "focus-shortcut-hint custom");
			expect(hint).toHaveAttribute("aria-hidden", "true");
			expect(hint).toHaveAttribute("translate", "no");
			expect(hint).not.toHaveAttribute("hidden");
		});
	});

	test("wraps a Query.Input, with the hint as its child", () => {
		function QueryField() {
			const [value, setValue] = useState("");
			return (
				<Query.Root grammar={testGrammar} value={value} onValueChange={setValue}>
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							<Query.Input aria-label="Filter" placeholder="Filter">
								<FocusShortcut.Hint data-testid="hint" />
							</Query.Input>
						</FocusShortcut.Field>
					</FocusShortcut.Root>
				</Query.Root>
			);
		}
		render(<QueryField />);
		const field = screen.getByRole("combobox", { name: "Filter" });

		expect(field).toHaveAttribute("aria-keyshortcuts", "/");
		expect(screen.getByTestId("hint").closest('[data-slot~="input"]')).toContainElement(field);
		pressSlash();
		expect(field).toHaveFocus();
		expect(screen.getByTestId("hint")).toHaveAttribute("hidden");
	});

	test("wraps a Combobox.Input", () => {
		render(
			<Combobox.Root>
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<Combobox.Input aria-label="Account" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint />
				</FocusShortcut.Root>
				<Combobox.Content>
					<Combobox.Item value="Acme" />
				</Combobox.Content>
			</Combobox.Root>,
		);
		const field = screen.getByRole("combobox", { name: "Account" });

		expect(field).toHaveAttribute("aria-keyshortcuts", "/");
		pressSlash();
		expect(field).toHaveFocus();
	});

	test("throws outside FocusShortcut.Root", () => {
		expect(() =>
			render(
				<FocusShortcut.Field>
					<input aria-label="Search" />
				</FocusShortcut.Field>,
			),
		).toThrow("FocusShortcut.Field must be rendered inside FocusShortcut.Root.");
	});
});

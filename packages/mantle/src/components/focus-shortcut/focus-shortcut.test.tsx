import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { type ComponentProps, createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { testGrammar } from "../../utils/query-filter/test-grammar.js";
import * as Combobox from "../combobox/combobox-parts.js";
import * as FieldParts from "../field/field-parts.js";
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

	test("passes over a field in an aria-disabled group, and hides its hint", () => {
		render(
			<>
				<div role="group" aria-disabled="true">
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							<input aria-label="Locked" />
						</FocusShortcut.Field>
						<FocusShortcut.Hint data-testid="locked hint" />
					</FocusShortcut.Root>
				</div>
				<SearchField label="Open" />
			</>,
		);

		pressSlash();

		expect(screen.getByRole("textbox", { name: "Open" })).toHaveFocus();
		expect(screen.getByTestId("locked hint")).toHaveAttribute("hidden");
	});

	test("takes `/` from a focused checkbox, which cannot type it", () => {
		render(
			<>
				<input type="checkbox" aria-label="Active" />
				<SearchField />
			</>,
		);
		const checkbox = screen.getByRole("checkbox", { name: "Active" });
		checkbox.focus();

		pressSlash(checkbox);

		expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
	});

	test("passes over a field in a shadow root that aria-hidden hides", () => {
		const host = document.createElement("div");
		host.setAttribute("aria-hidden", "true");
		document.body.append(host);
		const shadowRoot = host.attachShadow({ mode: "open" });
		const { unmount } = render(<SearchField label="Hidden" />, {
			container: shadowRoot.appendChild(document.createElement("div")),
		});
		render(<SearchField label="Shown" />);

		try {
			pressSlash();

			expect(screen.getByRole("textbox", { name: "Shown" })).toHaveFocus();
		} finally {
			unmount();
			host.remove();
		}
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

		test("hides while a select has a value", () => {
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<select aria-label="Region" defaultValue="us">
							<option value="">Any</option>
							<option value="us">US</option>
						</select>
					</FocusShortcut.Field>
					<FocusShortcut.Hint data-testid="hint" />
				</FocusShortcut.Root>,
			);

			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");
		});

		test("hides once the field unmounts", async () => {
			function Toggle() {
				const [isShown, setIsShown] = useState(true);
				return (
					<>
						<button type="button" onClick={() => setIsShown(false)}>
							Remove
						</button>
						<FocusShortcut.Root>
							{isShown && (
								<FocusShortcut.Field>
									<input aria-label="Search" />
								</FocusShortcut.Field>
							)}
							<FocusShortcut.Hint data-testid="hint" />
						</FocusShortcut.Root>
					</>
				);
			}
			const user = userEvent.setup();
			render(<Toggle />);
			expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden");

			await user.click(screen.getByRole("button", { name: "Remove" }));

			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");
		});

		test("follows a value that only the child's own state sets", async () => {
			// Why own state: the child rerenders alone, and `Field` sees no new props.
			function OwnStateInput(props: ComponentProps<"input">) {
				const [value, setValue] = useState("acme");
				return (
					<>
						<input {...props} value={value} onChange={(event) => setValue(event.target.value)} />
						<button type="button" onClick={() => setValue("")}>
							Clear
						</button>
					</>
				);
			}
			const user = userEvent.setup();
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<OwnStateInput aria-label="Search" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint data-testid="hint" />
				</FocusShortcut.Root>,
			);
			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");

			await user.click(screen.getByRole("button", { name: "Clear" }));

			await waitFor(() => expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden"));
		});

		test("shows again after a form reset empties the field", async () => {
			const user = userEvent.setup();
			render(
				<form>
					<SearchField />
					<button type="reset">Reset</button>
				</form>,
			);
			const field = screen.getByRole("textbox", { name: "Search" });
			await user.type(field, "acme");
			act(() => field.blur());
			expect(screen.getByTestId("Search hint")).toHaveAttribute("hidden");

			await user.click(screen.getByRole("button", { name: "Reset" }));

			await waitFor(() => expect(screen.getByTestId("Search hint")).not.toHaveAttribute("hidden"));
		});

		test("stays decorative when a caller passes `aria-hidden={false}`", () => {
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<input aria-label="Search" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint aria-hidden={false} data-testid="hint" />
				</FocusShortcut.Root>,
			);

			expect(screen.getByTestId("hint")).toHaveAttribute("aria-hidden", "true");
		});

		test("shows again after a form reset empties a select", async () => {
			const user = userEvent.setup();
			render(
				<form>
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							<select aria-label="Region" defaultValue="">
								<option value="">Any</option>
								<option value="us">US</option>
							</select>
						</FocusShortcut.Field>
						<FocusShortcut.Hint data-testid="hint" />
					</FocusShortcut.Root>
					<button type="reset">Reset</button>
				</form>,
			);
			await user.selectOptions(screen.getByRole("combobox", { name: "Region" }), "us");
			act(() => screen.getByRole("combobox", { name: "Region" }).blur());
			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");

			await user.click(screen.getByRole("button", { name: "Reset" }));

			await waitFor(() => expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden"));
		});

		test("hides while a contenteditable textbox has text", () => {
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<div aria-label="Note" contentEditable role="textbox" suppressContentEditableWarning>
							Saved filter
						</div>
					</FocusShortcut.Field>
					<FocusShortcut.Hint data-testid="hint" />
				</FocusShortcut.Root>,
			);

			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");
		});

		test("does not render the field again on focus when no hint is mounted", async () => {
			const onRender = vi.fn<() => void>();
			function CountedInput(props: ComponentProps<"input">) {
				onRender();
				return <input {...props} />;
			}
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<CountedInput aria-label="Search" />
					</FocusShortcut.Field>
				</FocusShortcut.Root>,
			);
			const mounted = onRender.mock.calls.length;

			pressSlash();
			act(() => screen.getByRole("textbox", { name: "Search" }).blur());

			expect(onRender).toHaveBeenCalledTimes(mounted);
		});

		test("stops tracking a replaced field whose child ref returns no cleanup", () => {
			function Legacy({ ref, ...props }: ComponentProps<"input">) {
				return (
					<input
						{...props}
						ref={(node) => {
							if (typeof ref === "function") {
								ref(node);
							}
						}}
					/>
				);
			}
			function Swap({ legacy }: { legacy: boolean }) {
				return (
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							{legacy ? <Legacy aria-label="Old" /> : <input aria-label="New" />}
						</FocusShortcut.Field>
						<FocusShortcut.Hint data-testid="hint" />
					</FocusShortcut.Root>
				);
			}
			const { rerender } = render(<Swap legacy />);
			const old = screen.getByRole<HTMLInputElement>("textbox", { name: "Old" });
			rerender(<Swap legacy={false} />);

			act(() => {
				old.value = "acme";
				old.dispatchEvent(new Event("input"));
			});

			expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden");
		});

		test("does not attach the child's ref again when a hint mounts", () => {
			const childRef = vi.fn<(node: HTMLInputElement | null) => void>();
			function Toggle({ withHint }: { withHint: boolean }) {
				return (
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							<input aria-label="Search" ref={childRef} />
						</FocusShortcut.Field>
						{withHint && <FocusShortcut.Hint />}
					</FocusShortcut.Root>
				);
			}
			const { rerender } = render(<Toggle withHint={false} />);
			const attached = childRef.mock.calls.length;

			rerender(<Toggle withHint />);

			expect(childRef).toHaveBeenCalledTimes(attached);
		});

		test("ignores a queued reset once the field is replaced", () => {
			function Replacing() {
				const [generation, setGeneration] = useState(0);
				return (
					<form onReset={() => setGeneration(generation + 1)}>
						<FocusShortcut.Root>
							<FocusShortcut.Field>
								<input
									aria-label="Search"
									defaultValue={generation === 0 ? "acme" : undefined}
									key={generation}
								/>
							</FocusShortcut.Field>
							<FocusShortcut.Hint data-testid="hint" />
						</FocusShortcut.Root>
						<button type="reset">Reset</button>
					</form>
				);
			}
			vi.useFakeTimers();
			try {
				const { container } = render(<Replacing />);

				act(() => container.querySelector("form")?.reset());
				act(() => {
					vi.runAllTimers();
				});

				expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("");
				expect(screen.getByTestId("hint")).not.toHaveAttribute("hidden");
			} finally {
				vi.useRealTimers();
			}
		});

		test("owns `hidden` and `aria-hidden` over an asChild child", () => {
			render(
				<FocusShortcut.Root>
					<FocusShortcut.Field>
						<input aria-label="Search" defaultValue="acme" />
					</FocusShortcut.Field>
					<FocusShortcut.Hint asChild data-testid="hint">
						<span aria-hidden={false} hidden={false}>
							/
						</span>
					</FocusShortcut.Hint>
				</FocusShortcut.Root>,
			);

			expect(screen.getByTestId("hint")).toHaveAttribute("hidden");
			expect(screen.getByTestId("hint")).toHaveAttribute("aria-hidden", "true");
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

	test("keeps the label, description, id, and name from Field.Control", () => {
		render(
			<FieldParts.Item id="owned" name="search">
				<FieldParts.Label>Search</FieldParts.Label>
				<FocusShortcut.Root>
					<FieldParts.Control>
						<FocusShortcut.Field>
							<input aria-keyshortcuts="Control+K" id="other" name="child" />
						</FocusShortcut.Field>
					</FieldParts.Control>
				</FocusShortcut.Root>
				<FieldParts.Description>Type a name.</FieldParts.Description>
			</FieldParts.Item>,
		);
		const field = screen.getByRole("textbox", { name: "Search" });

		expect(field).toHaveAccessibleDescription("Type a name.");
		expect(field).toHaveAttribute("id", "owned");
		expect(field).toHaveAttribute("name", "search");
		expect(field).toHaveAttribute("aria-keyshortcuts", "Control+K /");
	});

	test("keeps mount order when an earlier field's child passes a new ref", async () => {
		function Churning() {
			const [count, setCount] = useState(0);
			return (
				<>
					<button type="button" onClick={() => setCount(count + 1)}>
						Rerender
					</button>
					<FocusShortcut.Root>
						<FocusShortcut.Field>
							<input aria-label="First" data-count={count} ref={() => {}} />
						</FocusShortcut.Field>
					</FocusShortcut.Root>
				</>
			);
		}
		const user = userEvent.setup();
		render(
			<>
				<Churning />
				<SearchField label="Second" />
			</>,
		);

		await user.click(screen.getByRole("button", { name: "Rerender" }));
		act(() => screen.getByRole("button", { name: "Rerender" }).blur());
		pressSlash();

		expect(screen.getByRole("textbox", { name: "First" })).toHaveFocus();
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

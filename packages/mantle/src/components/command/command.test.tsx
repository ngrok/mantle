import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Command } from "./command.js";
import { useCommandDialog } from "./dialog-context.js";

/**
 * The control `Command.SearchTrigger` wraps. Presentation is always the child's
 * — the part renders no DOM of its own — so every test that used to assert the
 * trigger's own chrome now asserts what reaches this button instead.
 */
function SearchButton(props: ComponentProps<"button">) {
	return (
		<button type="button" {...props}>
			Search…
		</button>
	);
}

/**
 * The palette used across this suite: a search trigger plus a dialog with an
 * input. `Command.List` is deliberately absent — cmdk's list installs a
 * `ResizeObserver` that happy-dom cannot drive, and nothing here needs
 * filtering. List behavior is covered in `command.browser.test.tsx`.
 */
function Palette(props: ComponentProps<typeof Command.DialogRoot>) {
	return (
		<Command.DialogRoot {...props}>
			<Command.SearchTrigger>
				<SearchButton />
			</Command.SearchTrigger>
			<Command.DialogContent title="Test Command Palette">
				<Command.Input placeholder="Type a command or search..." />
			</Command.DialogContent>
		</Command.DialogRoot>
	);
}

const trigger = () => screen.getByRole("button", { name: "Search…" });
const queryInput = () => screen.queryByPlaceholderText("Type a command or search...");
const input = () => screen.getByPlaceholderText("Type a command or search...");

/**
 * The chord that toggles the palette under this suite. happy-dom reports a
 * non-Apple `navigator.platform` on every machine (asserted in
 * `utils/platform.test.ts`), so the platform modifier here is `Ctrl`. Apple
 * behavior is covered by stubbing the platform explicitly.
 */
const platformChord = "{Control>}k{/Control}";

/** Moves focus to the search trigger the way a keyboard user would. */
async function focusTrigger(user: ReturnType<typeof userEvent.setup>) {
	await user.tab();
	expect(trigger()).toHaveFocus();
}

describe("Command.SearchTrigger", () => {
	test("renders a button whose accessible name is its visible label", () => {
		render(<Palette />);
		// The visible label is the accessible name on purpose: no aria-label, so
		// the two cannot drift apart. Catches adding one back.
		expect(trigger()).toHaveTextContent("Search…");
		expect(trigger()).not.toHaveAttribute("aria-label");
	});

	test("renders no DOM of its own — the child is the trigger", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Command.DialogRoot>
				<Command.SearchTrigger>
					<SearchButton className="custom-class" data-flavor="primary" ref={ref} />
				</Command.SearchTrigger>
			</Command.DialogRoot>,
		);
		// Exactly one button: a wrapper element of its own would mean this part
		// had an opinion about presentation, which is the child's alone.
		expect(screen.getAllByRole("button")).toHaveLength(1);
		const button = trigger();
		expect(button.className).toContain("custom-class");
		expect(button).toHaveAttribute("data-flavor", "primary");
		expect(ref.current).toBe(button);
	});

	test("carries the dialog trigger ARIA contract onto the child", () => {
		render(<Palette />);
		// Supplied by the Dialog.Trigger this part composes. Catches dropping that
		// wrapper, which would also lose focus restoration.
		expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
		expect(trigger()).toHaveAttribute("aria-expanded", "false");
		expect(trigger()).toHaveAttribute("data-state", "closed");
	});

	test("its data-slot joins ahead of the child's own", () => {
		// The chain reads in DOM order, so a consumer stylesheet can target either
		// the palette wiring or the row that carries it.
		render(
			<Command.DialogRoot>
				<Command.SearchTrigger>
					<SearchButton data-slot="app-search-row" />
				</Command.SearchTrigger>
			</Command.DialogRoot>,
		);
		expect(trigger()).toHaveAttribute("data-slot", "command-search-trigger app-search-row");
	});

	test("data-state and aria-expanded follow the open state", async () => {
		const user = userEvent.setup();
		render(
			<Command.DialogRoot>
				<Command.SearchTrigger>
					<SearchButton data-testid="trigger" />
				</Command.SearchTrigger>
				<Command.DialogContent title="Test Command Palette">
					<Command.Input placeholder="Type a command or search..." />
				</Command.DialogContent>
			</Command.DialogRoot>,
		);
		await user.click(screen.getByTestId("trigger"));

		// Queried by test id rather than by role: the open modal marks everything
		// outside it `aria-hidden`, so a role query cannot see the trigger at all
		// once the dialog is up.
		await waitFor(() => {
			expect(screen.getByTestId("trigger")).toHaveAttribute("data-state", "open");
		});
		expect(screen.getByTestId("trigger")).toHaveAttribute("aria-expanded", "true");
	});

	describe("aria-keyshortcuts", () => {
		test("advertises Control+K in the server render", () => {
			// The server cannot know the platform, so it renders the non-Apple
			// answer and corrects itself in an effect. Asserting post-mount state
			// cannot observe the render path.
			const html = renderToString(<Palette />);
			expect(html).toContain('aria-keyshortcuts="Control+K"');
		});

		test("advertises Meta+K on an Apple platform", async () => {
			// `restoreMocks` in vitest.config.ts tears the spy down between tests.
			vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
			render(<Palette />);
			await waitFor(() => {
				expect(trigger()).toHaveAttribute("aria-keyshortcuts", "Meta+K");
			});
		});

		test("is absent when the root does not own the shortcut", () => {
			render(<Palette keyboardShortcut={false} />);
			// Never advertise a binding that is not bound. The visible hint is the
			// child's to render and reads the same flag through
			// `useCommandDialog().keyboardShortcut`.
			expect(trigger()).not.toHaveAttribute("aria-keyshortcuts");
		});

		test("a consumer-supplied value wins over the platform chord", () => {
			// The documented escape hatch: `keyboardShortcut={false}` means the app
			// binds the chord, so the app also owns what is announced. Overwriting it
			// with `undefined` would silently un-announce a real binding.
			render(
				<Command.DialogRoot keyboardShortcut={false}>
					<Command.SearchTrigger aria-keyshortcuts="Alt+S">
						<SearchButton />
					</Command.SearchTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." />
					</Command.DialogContent>
				</Command.DialogRoot>,
			);
			expect(trigger()).toHaveAttribute("aria-keyshortcuts", "Alt+S");
		});
	});

	describe("typing into the trigger", () => {
		test("a printable keystroke opens the palette seeded with that character", async () => {
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("e");

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("e");
		});

		test("Enter opens the palette with an empty query", async () => {
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("");
		});

		test("Space opens the palette with an empty query, not a space", async () => {
			// The blog's original trigger seeded `" "` here, because `key.length === 1`
			// matches a space. Catches removing the activation-key guard.
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard(" ");

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("");
		});

		test("Tab moves focus on instead of opening the palette", async () => {
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("{Tab}");

			expect(queryInput()).not.toBeInTheDocument();
			expect(trigger()).not.toHaveFocus();
		});

		test("the child's own onKeyDown runs first and preventDefault() vetoes the open", async () => {
			const user = userEvent.setup();
			const onKeyDown = vi.fn<(event: { preventDefault: () => void }) => void>((event) => {
				event.preventDefault();
			});
			render(
				<Command.DialogRoot>
					<Command.SearchTrigger>
						<SearchButton onKeyDown={onKeyDown} />
					</Command.SearchTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." />
					</Command.DialogContent>
				</Command.DialogRoot>,
			);
			await focusTrigger(user);

			await user.keyboard("e");

			expect(onKeyDown).toHaveBeenCalledTimes(1);
			expect(queryInput()).not.toBeInTheDocument();
		});

		test("pasting opens the palette seeded with the clipboard text", async () => {
			// fireEvent, not user.paste(): user-event routes a paste through the
			// focused element's editable value, and this trigger is a <button> with
			// no value to write to. The handler is still driven end to end.
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			fireEvent.paste(trigger(), {
				clipboardData: { getData: () => "api endpoints" },
			});

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("api endpoints");
		});
	});

	test("throws when rendered outside Command.DialogRoot", () => {
		// An inert trigger that silently opens nothing is worse than a loud failure.
		expect(() =>
			render(
				<Command.SearchTrigger>
					<SearchButton />
				</Command.SearchTrigger>,
			),
		).toThrow(/Command\.SearchTrigger must be rendered inside Command\.DialogRoot/);
	});
});

describe("Command.DialogRoot", () => {
	describe("keyboard shortcut", () => {
		test("Ctrl+K opens the palette", async () => {
			const user = userEvent.setup();
			render(<Palette />);

			await user.keyboard(platformChord);

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
		});

		test("keyboardShortcut={false} leaves the chord alone", async () => {
			const user = userEvent.setup();
			render(<Palette keyboardShortcut={false} />);

			await user.keyboard(platformChord);

			expect(queryInput()).not.toBeInTheDocument();
		});

		test("⌘K does not open the palette on a non-Apple platform", async () => {
			// The two platform modifiers are distinct chords and must not substitute
			// for each other in either direction.
			const user = userEvent.setup();
			render(<Palette />);

			await user.keyboard("{Meta>}k{/Meta}");

			expect(queryInput()).not.toBeInTheDocument();
		});

		test("Ctrl+Shift+K passes through to the browser", async () => {
			const user = userEvent.setup();
			render(<Palette />);

			await user.keyboard("{Control>}{Shift>}k{/Shift}{/Control}");

			expect(queryInput()).not.toBeInTheDocument();
		});

		test("still fires with Caps Lock on (uppercase key without shift)", () => {
			// With Caps Lock engaged, browsers report key "K" while shiftKey stays
			// false. Raw dispatch because user-event's "K" always implies Shift.
			render(<Palette />);

			fireEvent.keyDown(window, { key: "K", ctrlKey: true });

			expect(queryInput()).toBeInTheDocument();
		});

		test("a held chord does not flap the palette", () => {
			render(<Palette />);

			fireEvent.keyDown(window, { key: "k", ctrlKey: true });
			fireEvent.keyDown(window, { key: "k", ctrlKey: true, repeat: true });

			// Without the `repeat` guard the second event would toggle it shut.
			expect(queryInput()).toBeInTheDocument();
		});

		test("yields the chord to a handler that already claimed it", () => {
			render(<Palette />);

			const event = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				ctrlKey: true,
				key: "k",
			});
			event.preventDefault();
			window.dispatchEvent(event);

			// cmdk maps Ctrl+K to "previous item" inside an open palette and
			// preventDefault()s it; this listener must not act on an already-handled
			// keypress.
			expect(queryInput()).not.toBeInTheDocument();
		});

		test.for([
			[
				"a textarea, which is what code editors attach to",
				<textarea key="textarea" data-testid="editor" />,
			],
			[
				"a contenteditable host",
				<div key="editable" contentEditable suppressContentEditableWarning data-testid="editor" />,
			],
		] as const)("the shortcut is ignored when the event target is %s", ([, field]) => {
			// ⌘K is "insert link" in a rich-text editor and a chord prefix in Monaco.
			// This is a bubble-phase window listener that preventDefault()s, so
			// without the guard it reaches inside every editor.
			render(
				<>
					{field}
					<Palette />
				</>,
			);

			fireEvent.keyDown(screen.getByTestId("editor"), { key: "k", ctrlKey: true });

			expect(queryInput()).not.toBeInTheDocument();
		});

		test("the shortcut still fires from a plain input", () => {
			// Deliberately narrower than Sidebar's guard: a global palette opens from
			// anywhere, including an app's own filter field.
			render(
				<>
					<input data-testid="filter" />
					<Palette />
				</>,
			);

			fireEvent.keyDown(screen.getByTestId("filter"), { key: "k", ctrlKey: true });

			expect(queryInput()).toBeInTheDocument();
		});

		test("only the first mounted root responds to the chord", () => {
			// Two palettes must not open together. The second root queues and waits
			// for the first to unmount.
			render(
				<>
					<Palette />
					<Command.DialogRoot>
						<Command.DialogContent title="Second Command Palette">
							<Command.Input placeholder="Second palette" />
						</Command.DialogContent>
					</Command.DialogRoot>
				</>,
			);

			fireEvent.keyDown(window, { key: "k", ctrlKey: true });

			expect(queryInput()).toBeInTheDocument();
			expect(screen.queryByPlaceholderText("Second palette")).not.toBeInTheDocument();
		});

		describe("on Apple platforms", () => {
			// The handler resolves the platform once per mount, so the stub has to be
			// installed before `render()` — a `beforeEach` is the only safe place.
			// `restoreMocks` in vitest.config.ts undoes it between tests.
			beforeEach(() => {
				vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
			});

			test("⌘K opens the palette and ⌘K again closes it", async () => {
				const user = userEvent.setup();
				render(<Palette />);

				await user.keyboard("{Meta>}k{/Meta}");
				await waitFor(() => {
					expect(queryInput()).toBeInTheDocument();
				});

				await user.keyboard("{Meta>}k{/Meta}");
				await waitFor(() => {
					expect(queryInput()).not.toBeInTheDocument();
				});
			});

			test("Ctrl+K is left to macOS, which binds it to kill-to-end-of-line", async () => {
				const user = userEvent.setup();
				render(<Palette />);

				await user.keyboard("{Control>}k{/Control}");

				expect(queryInput()).not.toBeInTheDocument();
			});
		});
	});

	describe("query lifecycle", () => {
		test("reopening after dismissal starts from an empty query", async () => {
			// The blog's provider cleared its seed but not its query, so Escape then
			// ⌘K reopened with the previous search still in the field.
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("e");
			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("e");

			await user.keyboard("{Escape}");
			await waitFor(() => {
				expect(queryInput()).not.toBeInTheDocument();
			});

			await user.keyboard(platformChord);
			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("");
		});

		test("clicking the trigger opens with an empty query after a seeded session", async () => {
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("e");
			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			await user.keyboard("{Escape}");
			await waitFor(() => {
				expect(queryInput()).not.toBeInTheDocument();
			});

			await user.click(trigger());

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("");
		});

		test("typing in the palette updates the query the hook reports", async () => {
			const user = userEvent.setup();
			function QueryProbe() {
				const { query } = useCommandDialog();
				return <output data-testid="query">{query}</output>;
			}
			render(
				<Command.DialogRoot defaultOpen>
					<QueryProbe />
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." />
					</Command.DialogContent>
				</Command.DialogRoot>,
			);

			await user.type(input(), "cal");

			// This is what a `shouldFilter={false}` palette reads to run its own
			// search; a Command.Input that stopped reporting would break it silently.
			expect(screen.getByTestId("query")).toHaveTextContent("cal");
			expect(input()).toHaveValue("cal");
		});

		test("the caret lands at the end of a seeded query, not over it", async () => {
			// Cross-part pin: `Command.DialogContent`'s open-autofocus handler finds
			// the field with `[data-slot="command-input"]`, which `Command.Input`
			// stamps. Renaming either side restores Radix's own autofocus, which
			// selects the whole value — so the first keystroke after a seeded open
			// would replace the seed instead of extending it.
			const user = userEvent.setup();
			render(<Palette />);
			await focusTrigger(user);

			await user.keyboard("e");
			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});

			expect(document.querySelector('[data-slot~="command-input"]')).toBe(input());
			await waitFor(() => {
				expect(input()).toHaveFocus();
			});
			expect(input()).toHaveValue("e");
			expect(input()).toHaveProperty("selectionStart", 1);
			expect(input()).toHaveProperty("selectionEnd", 1);
		});

		test("a forwarded data-slot on Command.Input cannot take the caret fix away", async () => {
			// Same cross-part pin from the consumer's side: `command-input` is joined
			// after the spread rather than replaced by it, so a styling hook on the
			// field cannot silently restore Radix's select-the-whole-value autofocus.
			const user = userEvent.setup();
			render(
				<Command.DialogRoot>
					<Command.SearchTrigger>
						<SearchButton />
					</Command.SearchTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." data-slot="app-field" />
					</Command.DialogContent>
				</Command.DialogRoot>,
			);
			await focusTrigger(user);

			await user.keyboard("e");
			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});

			expect(input()).toHaveAttribute("data-slot", "app-field command-input");
			expect(input()).toHaveProperty("selectionStart", 1);
			expect(input()).toHaveProperty("selectionEnd", 1);
		});

		test.for([
			["there is no Command.Input", null],
			// The blog's palette disables its input while its posts load; focusing a
			// disabled element is a no-op, so taking Radix's autofocus over would
			// leave focus outside the dialog with no focus trap.
			[
				"the Command.Input is disabled",
				<Command.Input key="input" placeholder="Type a command or search..." disabled />,
			],
		] as const)("falls back to Radix's own autofocus when %s", async ([, field]) => {
			const user = userEvent.setup();
			render(
				<Command.DialogRoot>
					<Command.SearchTrigger>
						<SearchButton data-testid="trigger" />
					</Command.SearchTrigger>
					<Command.DialogContent title="Test Command Palette">{field}</Command.DialogContent>
				</Command.DialogRoot>,
			);

			await user.click(screen.getByTestId("trigger"));

			const close = await screen.findByRole("button", { name: "Close Dialog" });
			await waitFor(() => {
				expect(close).toHaveFocus();
			});
		});

		test("a consumer-controlled Command.Input keeps ownership of the query", async () => {
			// Documented trade-off: passing `value` opts out of seeding entirely.
			const user = userEvent.setup();
			render(
				<Command.DialogRoot>
					<Command.SearchTrigger>
						<SearchButton />
					</Command.SearchTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." value="pinned" />
					</Command.DialogContent>
				</Command.DialogRoot>,
			);
			await focusTrigger(user);

			await user.keyboard("e");

			await waitFor(() => {
				expect(queryInput()).toBeInTheDocument();
			});
			expect(input()).toHaveValue("pinned");
		});

		test("onValueChange still fires while the palette owns the query", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: string) => void>();
			render(
				<Command.DialogRoot defaultOpen>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input
							placeholder="Type a command or search..."
							onValueChange={onValueChange}
						/>
					</Command.DialogContent>
				</Command.DialogRoot>,
			);

			await user.type(input(), "ab");

			expect(onValueChange).toHaveBeenCalledTimes(2);
			expect(onValueChange).toHaveBeenLastCalledWith("ab");
		});
	});

	describe("open state", () => {
		test("defaultOpen renders the palette open", () => {
			render(<Palette defaultOpen />);
			expect(queryInput()).toBeInTheDocument();
		});

		test("a controlled root defers to the consumer's state", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn<(open: boolean) => void>();
			render(<Palette open={false} onOpenChange={onOpenChange} />);

			await user.click(trigger());

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenLastCalledWith(true);
			// `open={false}` is authoritative: the internal state must not win.
			expect(queryInput()).not.toBeInTheDocument();
		});
	});
});

describe("useCommandDialog", () => {
	test("throws outside Command.DialogRoot", () => {
		function Orphan() {
			useCommandDialog();
			return null;
		}
		expect(() => render(<Orphan />)).toThrow(
			/useCommandDialog must be used within Command\.DialogRoot/,
		);
	});

	test("openWithQuery opens the palette seeded from anywhere in the tree", async () => {
		const user = userEvent.setup();
		function SearchEndpointsLink() {
			const { openWithQuery } = useCommandDialog();
			return (
				<button type="button" onClick={() => openWithQuery("endpoints")}>
					Search endpoints
				</button>
			);
		}
		render(
			<Command.DialogRoot>
				<SearchEndpointsLink />
				<Command.DialogContent title="Test Command Palette">
					<Command.Input placeholder="Type a command or search..." />
				</Command.DialogContent>
			</Command.DialogRoot>,
		);

		await user.click(screen.getByRole("button", { name: "Search endpoints" }));

		await waitFor(() => {
			expect(queryInput()).toBeInTheDocument();
		});
		expect(input()).toHaveValue("endpoints");
	});

	test("setOpen(true) opens with an empty query", async () => {
		const user = userEvent.setup();
		function OpenButton() {
			const { setOpen } = useCommandDialog();
			return (
				<button type="button" onClick={() => setOpen(true)}>
					Open
				</button>
			);
		}
		render(
			<Command.DialogRoot>
				<OpenButton />
				<Command.DialogContent title="Test Command Palette">
					<Command.Input placeholder="Type a command or search..." />
				</Command.DialogContent>
			</Command.DialogRoot>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));

		await waitFor(() => {
			expect(queryInput()).toBeInTheDocument();
		});
		expect(input()).toHaveValue("");
	});

	test("keyboardShortcut reports whether the root owns the chord", () => {
		function ShortcutProbe() {
			const { keyboardShortcut } = useCommandDialog();
			return <output data-testid="owns">{String(keyboardShortcut)}</output>;
		}
		render(
			<Command.DialogRoot keyboardShortcut={false}>
				<ShortcutProbe />
			</Command.DialogRoot>,
		);
		expect(screen.getByTestId("owns")).toHaveTextContent("false");
	});
});

import { render, screen, waitFor, within } from "@testing-library/react";
import { PointerEventsCheckLevel, userEvent } from "@testing-library/user-event";
import { userEvent as browserUser } from "vitest/browser";
import { type ReactNode, useState } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import preflightCss from "tailwindcss/preflight.css?raw";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { installShakeStyle } from "../../test-utils/shake-style.js";
import * as AlertDialog from "../alert-dialog/alert-dialog-parts.js";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Sheet from "../sheet/sheet-parts.js";
import * as MultiSelect from "./multi-select-parts.js";

/**
 * `userEvent.setup()` with the pre-interaction `pointer-events` assertion turned
 * off. When an Ariakit popover drove `MultiSelect`, it could compute
 * `pointer-events: none` for a moment while it mounted, so user-event's default
 * check threw ("Unable to perform pointer interaction…") and flaked the
 * click-driven tests in CI. None of the behaviors here rely on that CSS guard
 * (locked tags enforce their lock in the remove handler, not via `pointer-events`),
 * so disabling the check makes clicks deterministic without weakening intent.
 *
 * @example
 * const user = setupUser();
 * await user.click(screen.getByRole("combobox"));
 */
const setupUser = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

/**
 * `getPrefersReducedMotion()` queries `(prefers-reduced-motion: no-preference)` and inverts the
 * result, so priming that query to `!reduced` is what the hook reads. Uses the shared stub rather
 * than a local object literal, which dropped every registered `"change"` listener on the floor.
 */
const stubPrefersReducedMotion = ({ reduced }: { reduced: boolean }) => {
	mockMatchMedia({ "(prefers-reduced-motion: no-preference)": !reduced });
};

installShakeStyle();

describe("MultiSelect (browser)", () => {
	/** Stateful subject. `lockedValues` marks the tags that cannot be removed. */
	const Subject = ({
		initialValues = [],
		lockedValues = [],
	}: {
		initialValues?: string[];
		lockedValues?: string[];
	}) => {
		const [values, setValues] = useState(initialValues);
		return (
			<MultiSelect.Root value={values} onValueChange={setValues}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues lockedValues={lockedValues} />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
					<MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);
	};

	/** Finds the listbox-scoped option by its visible label. */
	const getListboxOption = (label: RegExp | string) =>
		within(screen.getByRole("listbox")).getByRole("option", { name: label });

	/** Finds a tag's option element via its remove button's aria-label. */
	const getTagOption = (value: string): HTMLElement => {
		const removeBtn = screen.getByLabelText(`Remove ${value}`);
		const tagEl = removeBtn.closest<HTMLElement>('[role="listitem"]');
		if (tagEl == null) {
			throw new Error(`Tag option for "${value}" not found`);
		}
		return tagEl;
	};

	test("selected tags and the trigger keep the 0.95.0 geometry and styles", async () => {
		const style = document.createElement("style");
		const css = await Promise.all(
			["./multi-select.tsx", "../chip/chip.tsx", "./multi-select.browser.test.tsx"].map((file) =>
				commands.tailwindCss(file, { theme: true }),
			),
		);
		// Why preflight: the docs site and apps load it, and it resets the native button and svg boxes.
		style.textContent = `${preflightCss}\n${css.join("\n")}`;
		document.head.append(style);
		const longValue = "Production API credentials for the primary billing account";
		const values = [longValue, "apple"];
		try {
			render(
				<>
					<div className="w-50">
						<MultiSelect.Root value={values} onValueChange={() => {}}>
							<MultiSelect.Trigger data-testid="current">
								<MultiSelect.TagValues lockedValues={["apple"]} />
							</MultiSelect.Trigger>
						</MultiSelect.Root>
					</div>
					{/* The trigger and tag markup that @ngrok/mantle@0.95.0 shipped, as the reference. */}
					<div className="w-50">
						<div
							data-testid="released"
							className="cursor-text select-none font-sans text-sm border-form bg-form text-strong flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-3 py-1 has-data-[slot=multi-select-tag]:px-1"
						>
							<div className="contents">
								{values.map((value) => (
									<span
										key={value}
										data-slot="multi-select-tag"
										className="cursor-default bg-neutral-500/10 border border-neutral-500/20 rounded-xs text-strong inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 text-sm font-normal"
									>
										{value}
										<button
											type="button"
											className="cursor-pointer text-strong/40 hover:bg-neutral-500/15 hover:text-strong rounded-xs p-0.5"
										>
											<svg viewBox="0 0 256 256" className="size-4 shrink-0" />
										</button>
									</span>
								))}
							</div>
						</div>
					</div>
				</>,
			);

			/** The box of each tag part, relative to the trigger, plus the styles a reader sees. */
			const measure = (trigger: HTMLElement) => {
				const origin = trigger.getBoundingClientRect();
				const relative = (rect: DOMRect) => ({
					left: rect.left - origin.left,
					top: rect.top - origin.top,
					width: rect.width,
					height: rect.height,
				});
				const tags = [...trigger.querySelectorAll<HTMLElement>('[data-slot~="multi-select-tag"]')];
				return {
					trigger: { width: origin.width, height: origin.height },
					padding: getComputedStyle(trigger).padding,
					tags: tags.map((tag, index) => {
						const button = tag.querySelector("button");
						const icon = tag.querySelector("svg");
						const textNode = [...tag.querySelectorAll("*"), tag]
							.flatMap((element) => [...element.childNodes])
							.find(
								(node) => node.nodeType === Node.TEXT_NODE && node.textContent === values[index],
							);
						if (button == null || icon == null || textNode == null) {
							throw new Error("Expected a label, a remove button, and an icon");
						}
						const range = document.createRange();
						range.selectNodeContents(textNode);
						const tagStyle = getComputedStyle(tag);
						return {
							tag: relative(tag.getBoundingClientRect()),
							text: relative(range.getBoundingClientRect()),
							button: relative(button.getBoundingClientRect()),
							icon: relative(icon.getBoundingClientRect()),
							radius: [tagStyle.borderRadius, getComputedStyle(button).borderRadius],
							colors: [tagStyle.backgroundColor, tagStyle.borderColor],
							font: [
								tagStyle.fontFamily,
								tagStyle.fontSize,
								tagStyle.fontWeight,
								tagStyle.lineHeight,
							],
						};
					}),
				};
			};

			const current = measure(screen.getByTestId("current"));
			expect(current.tags).toHaveLength(2);
			// Why: the long value must wrap inside the trigger, as it did in 0.95.0.
			expect(current.tags[0]?.tag.height).toBeGreaterThan(26);
			expect(current).toEqual(measure(screen.getByTestId("released")));
		} finally {
			style.remove();
		}
	});

	describe("popover lifecycle", () => {
		const modalSubjects = [
			{
				name: "dialog",
				title: "Test Dialog",
				render: (children: ReactNode) => {
					const Subject = () => {
						const [open, setOpen] = useState(true);
						return (
							<Dialog.Root open={open} onOpenChange={setOpen}>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Test Dialog</Dialog.Title>
									</Dialog.Header>
									{children}
									<button type="button">Focus outside</button>
								</Dialog.Content>
							</Dialog.Root>
						);
					};

					return <Subject />;
				},
			},
			{
				name: "sheet",
				title: "Test Sheet",
				render: (children: ReactNode) => {
					const Subject = () => {
						const [open, setOpen] = useState(true);
						return (
							<Sheet.Root open={open} onOpenChange={setOpen}>
								<Sheet.Content>
									<Sheet.Header>
										<Sheet.Title>Test Sheet</Sheet.Title>
									</Sheet.Header>
									{children}
									<button type="button">Focus outside</button>
								</Sheet.Content>
							</Sheet.Root>
						);
					};

					return <Subject />;
				},
			},
			{
				name: "alert dialog",
				title: "Test Alert Dialog",
				render: (children: ReactNode) => {
					const Subject = () => {
						const [open, setOpen] = useState(true);
						return (
							<AlertDialog.Root intent="danger" open={open} onOpenChange={setOpen}>
								<AlertDialog.Content>
									<AlertDialog.Body>
										<AlertDialog.Header>
											<AlertDialog.Title>Test Alert Dialog</AlertDialog.Title>
										</AlertDialog.Header>
										{children}
										<button type="button">Focus outside</button>
									</AlertDialog.Body>
								</AlertDialog.Content>
							</AlertDialog.Root>
						);
					};

					return <Subject />;
				},
			},
		] as const;

		test("clicking the input opens the popover", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => {
				expect(screen.getByRole("listbox")).toBeVisible();
			});
		});

		test("Escape closes the popover", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.keyboard("{Escape}");
			await waitFor(() => {
				expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			});
		});

		for (const modal of modalSubjects) {
			test(`Escape closes only the popover when nested inside a ${modal.name}`, async () => {
				const user = setupUser();

				render(
					modal.render(
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>,
					),
				);

				const input = screen.getByRole("combobox");
				await user.click(input);
				await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
				expect(input).toHaveFocus();

				// Why a trusted key: a synthetic one never closes a `<dialog>`, so the
				// dialog would stay open whatever the input does with the key.
				await browserUser.keyboard("{Escape}");

				await waitFor(() => {
					expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
				});
				expect(screen.getByText(modal.title)).toBeInTheDocument();
				expect(screen.getByRole("combobox")).toBeInTheDocument();
			});

			test(`a second Escape closes the parent ${modal.name} after the popover closes`, async () => {
				const user = setupUser();

				render(
					modal.render(
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>,
					),
				);

				await user.click(screen.getByRole("combobox"));
				await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());

				await browserUser.keyboard("{Escape}");
				await waitFor(() => {
					expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
				});

				// Why a trusted key: the browser sends the close request of a
				// `<dialog>` only for a real key press.
				await browserUser.keyboard("{Escape}");
				await waitFor(() => {
					expect(screen.queryByText(modal.title)).not.toBeInTheDocument();
				});
			});

			test(`body interactivity is restored after unmounting a ${modal.name} with an open popover`, async () => {
				const user = setupUser();

				const { unmount } = render(
					modal.render(
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>,
					),
				);

				await user.click(screen.getByRole("combobox"));
				await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());

				unmount();

				// Why wait a frame: a body scroll lock can put back a stale body style, such as a
				// modal's transient `pointer-events: none`, in a microtask after unmount, as the
				// Ariakit popover did. A frame callback runs after that checkpoint, so the
				// assertion reads the settled style.
				await new Promise<void>((resolve) => {
					requestAnimationFrame(() => {
						resolve();
					});
				});

				expect(document.body.style.pointerEvents).not.toBe("none");
			});

			test(`Escape closes the parent ${modal.name} when the multi-select is not focused`, async () => {
				const user = setupUser();

				render(
					modal.render(
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>,
					),
				);

				await user.click(screen.getByRole("button", { name: "Focus outside" }));
				await browserUser.keyboard("{Escape}");

				await waitFor(() => {
					expect(screen.queryByText(modal.title)).not.toBeInTheDocument();
				});
			});
		}
	});

	describe("item selection", () => {
		test("clicking an item adds it as a tag", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.click(getListboxOption(/Apple/));
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("clicking multiple items adds each as a tag", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.click(getListboxOption(/Apple/));
			await user.click(getListboxOption(/Banana/));
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			expect(screen.getByLabelText("Remove banana")).toBeInTheDocument();
		});

		test("clicking a selected item deselects it and removes its tag", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			expect(getListboxOption(/Apple/)).toHaveAttribute("aria-selected", "true");
			await user.click(getListboxOption(/Apple/));
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
		});

		test("selected items are marked aria-selected in the popover", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple", "banana"]} />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			expect(getListboxOption(/Apple/)).toHaveAttribute("aria-selected", "true");
			expect(getListboxOption(/Banana/)).toHaveAttribute("aria-selected", "true");
			expect(getListboxOption(/Cherry/)).toHaveAttribute("aria-selected", "false");
		});
	});

	describe("typeahead filtering", () => {
		test("typing updates the input value and keeps the popover open", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.type(screen.getByRole("combobox"), "ban");
			await waitFor(() => {
				expect(screen.getByRole("combobox")).toHaveValue("ban");
				expect(screen.getByRole("listbox")).toBeVisible();
			});
		});

		test("selecting an item clears the input so all items show next time", async () => {
			const user = setupUser();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await user.type(screen.getByRole("combobox"), "app");
			await waitFor(() => expect(getListboxOption(/Apple/)).toBeInTheDocument());
			await user.click(getListboxOption(/Apple/));
			// Input should be reset to empty after selection
			expect(screen.getByRole("combobox")).toHaveValue("");
			// All other items should be visible again
			await waitFor(() => {
				expect(getListboxOption(/Banana/)).toBeInTheDocument();
				expect(getListboxOption(/Cherry/)).toBeInTheDocument();
			});
		});
	});

	describe("tag removal via click", () => {
		test("clicking the remove button removes only that tag", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple", "banana"]} />);
			await user.click(screen.getByLabelText("Remove apple"));
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Remove banana")).toBeInTheDocument();
		});

		test("removing a tag can be followed by reopening the popover", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			await user.click(screen.getByLabelText("Remove apple"));
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
			// The component is still functional: clicking the input reopens the popover
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
		});
	});

	describe("popover stays open while interacting with trigger", () => {
		test("clicking a tag keeps the popover open", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.click(getTagOption("apple"));
			expect(screen.getByRole("listbox")).toBeVisible();
		});

		test("clicking one tag then another keeps the popover open", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple", "banana"]} />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			await user.click(getTagOption("apple"));
			expect(screen.getByRole("listbox")).toBeVisible();
			await user.click(getTagOption("banana"));
			expect(screen.getByRole("listbox")).toBeVisible();
		});
	});

	describe("locked tags", () => {
		test("locked tag's remove button has aria-disabled", () => {
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			expect(screen.getByLabelText("Remove apple")).toHaveAttribute("aria-disabled", "true");
		});

		test("Backspace on a locked tag does not remove it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			getTagOption("apple").focus();
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("Backspace on empty input with a locked last tag does not remove any tag", async () => {
			const user = setupUser();
			// "banana" is last and locked, so Backspace shakes it instead of removing anything
			render(<Subject initialValues={["apple", "banana"]} lockedValues={["banana"]} />);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			expect(screen.getByLabelText("Remove banana")).toBeInTheDocument();
		});

		describe("with custom tag renderer", () => {
			/**
			 * Uses a children render function on TagValues so that onRemove and
			 * onKeyDown are forwarded to a consumer-controlled element, bypassing
			 * MultiSelect.Tag's own lock-guard UI. Verifies that locks are enforced
			 * at the TagValues level regardless of the tag implementation.
			 */
			const CustomSubject = ({
				initialValues = [],
				lockedValues = [],
			}: {
				initialValues?: string[];
				lockedValues?: string[];
			}) => {
				const [values, setValues] = useState(initialValues);
				return (
					<MultiSelect.Root value={values} onValueChange={setValues}>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues lockedValues={lockedValues}>
								{({ value, onRemove, ref, onKeyDown }) => (
									<span key={value} role="listitem" tabIndex={-1} ref={ref} onKeyDown={onKeyDown}>
										{value}
										<button
											type="button"
											aria-label={`Remove ${value}`}
											onClick={() => onRemove?.()}
										>
											x
										</button>
									</span>
								)}
							</MultiSelect.TagValues>
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
							<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							<MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>
				);
			};

			test("calling onRemove directly on a locked tag does not remove it", async () => {
				const user = setupUser();
				render(<CustomSubject initialValues={["apple"]} lockedValues={["apple"]} />);
				await user.click(screen.getByLabelText("Remove apple"));
				expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			});

			test("Backspace via onKeyDown on a locked custom tag does not remove it", async () => {
				const user = setupUser();
				render(<CustomSubject initialValues={["apple"]} lockedValues={["apple"]} />);
				getTagOption("apple").focus();
				await user.keyboard("{Backspace}");
				expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			});
		});
	});

	describe("blocked-removal feedback", () => {
		test("Backspace on a locked tag shakes it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			stubPrefersReducedMotion({ reduced: false });

			const tag = getTagOption("apple");
			expect(tag.getAnimations()).toHaveLength(0);

			tag.focus();
			await user.keyboard("{Backspace}");

			// The shake is the only feedback a blocked removal gives.
			expect(tag.getAnimations()).toHaveLength(1);
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("clicking a locked tag's remove button shakes it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			stubPrefersReducedMotion({ reduced: false });

			const tag = getTagOption("apple");
			await user.click(screen.getByLabelText("Remove apple"));

			expect(tag.getAnimations()).toHaveLength(1);
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("Backspace on an empty input shakes a locked last tag", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			stubPrefersReducedMotion({ reduced: false });

			const tag = getTagOption("apple");
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");

			expect(tag.getAnimations()).toHaveLength(1);
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("no shake animation is created when the user prefers reduced motion", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			stubPrefersReducedMotion({ reduced: true });

			const tag = getTagOption("apple");
			tag.focus();
			await user.keyboard("{Backspace}");

			expect(tag.getAnimations()).toHaveLength(0);
			// The lock itself is still enforced; only the animation is skipped.
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});
	});

	describe("printable character jumps focus to input", () => {
		test("typing a printable char while a tag is focused moves focus to the input", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			getTagOption("apple").focus();
			expect(getTagOption("apple")).toHaveFocus();
			await user.keyboard("b");
			expect(screen.getByRole("combobox")).toHaveFocus();
		});

		test("ctrl+key while a tag is focused does not jump to the input", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			getTagOption("apple").focus();
			// ctrl+a is a common selection shortcut and should not be hijacked
			await user.keyboard("{Control>}a{/Control}");
			expect(getTagOption("apple")).toHaveFocus();
		});

		test("meta+key while a tag is focused does not jump to the input", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} />);
			getTagOption("apple").focus();
			await user.keyboard("{Meta>}a{/Meta}");
			expect(getTagOption("apple")).toHaveFocus();
		});
	});
});

/**
 * Mirrors the CSS Tailwind 4 emits for the one utility the item's label div
 * carries. Inlined so the test stays hermetic and needs no Tailwind build step:
 * a browser test loads no stylesheet, so without this the wrapper would report
 * its initial `display` and the assertion would pass for the wrong reason.
 */
const ITEM_LABEL_STYLE = `
@layer utilities {
	.contents { display: contents; }
}
`;

describe("MultiSelect.Item label slot (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = ITEM_LABEL_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("the label div generates no box, so a child of your own stays a flex item", async () => {
		const user = setupUser();
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.Input placeholder="Pick fruit" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">
						<div data-testid="row">Apple</div>
					</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);

		await user.click(screen.getByRole("combobox"));
		const item = await screen.findByRole("option", { name: "Apple" });
		const label = item.querySelector('[data-slot="multi-select-item-label"]');
		if (label == null) {
			throw new Error('No element carries data-slot="multi-select-item-label".');
		}

		expect(getComputedStyle(label).display).toBe("contents");
		expect(label.getClientRects()).toHaveLength(0);
		// A `<div>` may legally hold the `<div>` a `MediaObject` child renders.
		expect(label.tagName).toBe("DIV");
		expect(screen.getByTestId("row").parentElement).toBe(label);
	});

	test("with a footer, the listbox scrolls above it and the footer stays in view", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./multi-select.tsx");
		document.head.append(style);
		try {
			const user = setupUser();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					{/* Why the style: the compiled CSS holds only the classes in multi-select.tsx. */}
					<MultiSelect.Content style={{ maxHeight: 160 }}>
						{Array.from({ length: 30 }, (_, index) => (
							<MultiSelect.Item key={index} value={`fruit-${index}`}>
								Fruit {index}
							</MultiSelect.Item>
						))}
						<MultiSelect.ContentFooter>
							<button type="button">Upgrade</button>
						</MultiSelect.ContentFooter>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			await user.click(screen.getByRole("combobox", { name: "Fruits" }));
			const list = await screen.findByRole("listbox");
			await waitFor(() => expect(list).toHaveAttribute("data-overflow-bottom"));
			const box = list.parentElement;
			const footer = screen.getByRole("button", { name: "Upgrade" });
			expect(box).not.toBeNull();
			const boxRect = box?.getBoundingClientRect();
			expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(
				list.getBoundingClientRect().bottom - 1,
			);
			expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual((boxRect?.bottom ?? 0) + 1);
		} finally {
			style.remove();
		}
	});

	test("the open list hides its scrollbar and stops overscroll", async () => {
		// Why the compiled CSS: this page loads no Tailwind, and the test checks the real utilities.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./multi-select.tsx");
		document.head.append(style);
		try {
			const user = setupUser();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			await user.click(screen.getByRole("combobox", { name: "Fruits" }));
			const list = await screen.findByRole("listbox");
			expect(getComputedStyle(list)).toMatchObject({
				overflowY: "auto",
				overscrollBehaviorY: "none",
				scrollbarWidth: "none",
			});
		} finally {
			style.remove();
		}
	});
	test("a Tab into the input opens the list; focus from script does not", async () => {
		render(
			<>
				<button type="button">Before</button>
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Fruits" });
		input.focus();
		expect(input).toHaveAttribute("aria-expanded", "false");
		screen.getByRole("button", { name: "Before" }).focus();

		await browserUser.keyboard("{Tab}");

		expect(input).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
	});
});

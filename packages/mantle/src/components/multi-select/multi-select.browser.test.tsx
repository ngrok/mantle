import { render, screen, waitFor, within } from "@testing-library/react";
import { PointerEventsCheckLevel, userEvent } from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { describe, expect, test } from "vitest";
import { AlertDialog } from "../alert-dialog/alert-dialog.js";
import { Dialog } from "../dialog/dialog.js";
import { Sheet } from "../sheet/sheet.js";
import { MultiSelect } from "./multi-select.js";

/**
 * `userEvent.setup()` with the pre-interaction `pointer-events` assertion turned
 * off. In browser mode, Ariakit's popover/portal can momentarily compute
 * `pointer-events: none` while it mounts and animates, so user-event's default
 * check throws ("Unable to perform pointer interaction…") and flakes the
 * click-driven tests in CI. None of the behaviors here rely on that CSS guard —
 * locked tags enforce their lock in the remove handler, not via `pointer-events`
 * — so disabling the check makes clicks deterministic without weakening intent.
 *
 * @example
 * const user = setupUser();
 * await user.click(screen.getByRole("combobox"));
 */
const setupUser = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

describe("MultiSelect (browser)", () => {
	/**
	 * Stateful subject. `lockedValues` marks specific tags as non-removable;
	 * when non-empty a children render function is used so locked can be applied.
	 */
	const Subject = ({
		initialValues = [],
		lockedValues = [],
	}: {
		initialValues?: string[];
		lockedValues?: string[];
	}) => {
		const [values, setValues] = useState(initialValues);
		return (
			<MultiSelect.Root selectedValue={values} setSelectedValue={setValues}>
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
		const tagEl = removeBtn.closest<HTMLElement>('[role="option"]');
		if (tagEl == null) {
			throw new Error(`Tag option for "${value}" not found`);
		}
		return tagEl;
	};

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
							<AlertDialog.Root priority="danger" open={open} onOpenChange={setOpen}>
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

				await user.keyboard("{Escape}");

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

				await user.keyboard("{Escape}");
				await waitFor(() => {
					expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
				});

				await user.keyboard("{Escape}");
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

				// Regression test: with ariakit's body scroll lock active alongside the
				// modal's, ariakit re-applied a stale body-style snapshot (including the
				// modal's transient `pointer-events: none`) on the animation frame after
				// unmount, permanently freezing the page. Wait past that frame plus a
				// macrotask so the assertion sees the settled state.
				await new Promise<void>((resolve) => {
					requestAnimationFrame(() => {
						resolve();
					});
				});
				await new Promise<void>((resolve) => {
					setTimeout(resolve, 50);
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
				await user.keyboard("{Escape}");

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
			// The component is still functional — clicking the input reopens the popover
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

		test("clicking a locked item in the popover does not deselect it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
			expect(getListboxOption(/Apple/)).toHaveAttribute("aria-selected", "true");
			await user.click(getListboxOption(/Apple/));
			// Tag should still be present
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			// Item should still be selected in the popover
			expect(getListboxOption(/Apple/)).toHaveAttribute("aria-selected", "true");
		});

		test("Backspace on a locked tag does not remove it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			getTagOption("apple").focus();
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("Delete on a locked tag does not remove it", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			getTagOption("apple").focus();
			await user.keyboard("{Delete}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("Backspace on empty input skips a locked last tag", async () => {
			const user = setupUser();
			render(<Subject initialValues={["apple"]} lockedValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("Backspace on empty input with a locked last tag does not remove any tag", async () => {
			const user = setupUser();
			// "banana" is last and locked — Backspace shakes it instead of removing anything
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
					<MultiSelect.Root selectedValue={values} setSelectedValue={setValues}>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues lockedValues={lockedValues}>
								{({ value, onRemove, ref, onKeyDown }) => (
									<span
										key={value}
										role="option"
										aria-selected
										tabIndex={-1}
										ref={ref}
										onKeyDown={onKeyDown}
									>
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

			test("calling onRemove directly on an unlocked tag removes it", async () => {
				const user = setupUser();
				render(<CustomSubject initialValues={["apple", "banana"]} lockedValues={["apple"]} />);
				await user.click(screen.getByLabelText("Remove banana"));
				expect(screen.queryByLabelText("Remove banana")).not.toBeInTheDocument();
				expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			});

			test("Backspace via onKeyDown on a locked custom tag does not remove it", async () => {
				const user = setupUser();
				render(<CustomSubject initialValues={["apple"]} lockedValues={["apple"]} />);
				getTagOption("apple").focus();
				await user.keyboard("{Backspace}");
				expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			});

			test("Delete via onKeyDown on a locked custom tag does not remove it", async () => {
				const user = setupUser();
				render(<CustomSubject initialValues={["apple"]} lockedValues={["apple"]} />);
				getTagOption("apple").focus();
				await user.keyboard("{Delete}");
				expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			});
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
			// ctrl+a is a common selection shortcut — should not be hijacked
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

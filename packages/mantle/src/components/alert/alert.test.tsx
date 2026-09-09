import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { $cssProperties } from "../../types/index.js";
import { Alert, AlertContextProvider } from "./alert.js";

function getAlertRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="alert"]');
}

/**
 * The documented dismissal pattern: the consumer's `onClick` stops rendering
 * the alert, which unmounts the button that holds focus.
 */
function DismissibleAlert() {
	const [dismissed, setDismissed] = useState(false);
	if (dismissed) {
		return null;
	}
	return (
		<Alert.Root intent="info">
			<Alert.Content>
				<Alert.Title>Trial ends soon</Alert.Title>
				<Alert.DismissIconButton onClick={() => setDismissed(true)} />
			</Alert.Content>
		</Alert.Root>
	);
}

describe("Alert", () => {
	test("renders title and description", () => {
		render(
			<Alert.Root intent="info">
				<Alert.Content>
					<Alert.Title>Heads up</Alert.Title>
					<Alert.Description>Something happened.</Alert.Description>
				</Alert.Content>
			</Alert.Root>,
		);
		expect(screen.getByText("Heads up")).toBeInTheDocument();
		expect(screen.getByText("Something happened.")).toBeInTheDocument();
	});

	test("passes role through to the root element", () => {
		render(
			<Alert.Root intent="danger" role="alert">
				<Alert.Content>
					<Alert.Description>Invalid email or password.</Alert.Description>
				</Alert.Content>
			</Alert.Root>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
	});

	describe("intent", () => {
		test.each([
			["danger", "text-danger-700"],
			["important", "text-important-700"],
			["info", "text-info-700"],
			["success", "text-success-700"],
			["warning", "text-warning-700"],
		] as const)(`renders intent="%s" with tone class %s`, (intent, toneClass) => {
			const { container } = render(
				<Alert.Root intent={intent}>
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(getAlertRoot(container)).toHaveClass(toneClass);
		});

		test("`intent` is required at the type level", () => {
			const missingIntent = (
				// @ts-expect-error -- intent is required on Alert.Root
				<Alert.Root>
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>
			);
			expect(missingIntent).toBeDefined();
		});
	});

	describe("Icon", () => {
		test("renders a default icon for the intent", () => {
			const { container } = render(
				<Alert.Root intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(container.querySelector('[data-slot="alert-icon"]')).toBeInTheDocument();
		});

		test("renders a custom svg in place of the default icon", () => {
			const { container } = render(
				<Alert.Root intent="info">
					<Alert.Icon svg={<svg data-testid="custom-icon" />} />
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument();
		});
	});

	describe("DismissIconButton", () => {
		test("renders a neutral ghost icon button with an accessible label and fires onClick", async () => {
			const onDismiss = vi.fn<() => void>();
			render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
						<Alert.DismissIconButton onClick={onDismiss} />
					</Alert.Content>
				</Alert.Root>,
			);
			const button = screen.getByRole("button", { name: "Dismiss Alert" });
			expect(button).toHaveAttribute("data-appearance", "ghost");
			expect(button).toHaveAttribute("data-intent", "neutral");
			await userEvent.click(button);
			expect(onDismiss).toHaveBeenCalledOnce();
		});

		describe("focus after the dismissal unmounts the alert", () => {
			test("moves focus to the next tabbable after the alert", async () => {
				const user = userEvent.setup();
				render(
					<>
						<button type="button">Before</button>
						<DismissibleAlert />
						<button type="button">After</button>
					</>,
				);

				await user.tab();
				await user.tab();
				expect(screen.getByRole("button", { name: "Dismiss Alert" })).toHaveFocus();

				await user.keyboard("{Enter}");

				expect(screen.queryByRole("button", { name: "Dismiss Alert" })).not.toBeInTheDocument();
				expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
			});

			test("falls back to the previous tabbable when nothing follows the alert", async () => {
				const user = userEvent.setup();
				render(
					<>
						<button type="button">Before</button>
						<DismissibleAlert />
					</>,
				);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
			});

			test("skips a following element a Tab press cannot reach", async () => {
				const user = userEvent.setup();
				render(
					<>
						<button type="button">Before</button>
						<DismissibleAlert />
						<button type="button" disabled>
							Disabled
						</button>
						<div tabIndex={-1}>Programmatic only</div>
						<button type="button">After</button>
					</>,
				);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
			});

			test("lands on a neighbor that survives when the same unmount removes the nearest one", async () => {
				function Card() {
					const [open, setOpen] = useState(true);
					if (!open) {
						return null;
					}
					return (
						<section>
							<Alert.Root intent="info">
								<Alert.Content>
									<Alert.Title>Trial ends soon</Alert.Title>
									<Alert.DismissIconButton onClick={() => setOpen(false)} />
								</Alert.Content>
							</Alert.Root>
							<button type="button">Apply</button>
						</section>
					);
				}
				const user = userEvent.setup();
				render(
					<>
						<button type="button">Before</button>
						<Card />
						<button type="button">After</button>
					</>,
				);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
				expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
			});

			test("leaves focus alone when the button does not hold it", () => {
				render(
					<>
						<button type="button">Before</button>
						<DismissibleAlert />
						<button type="button">After</button>
					</>,
				);
				const before = screen.getByRole("button", { name: "Before" });
				before.focus();

				// A synthetic click moves no focus, unlike a pointer or keyboard activation.
				fireEvent.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.queryByRole("button", { name: "Dismiss Alert" })).not.toBeInTheDocument();
				expect(before).toHaveFocus();
			});

			test("keeps focus where the consumer's handler put it", async () => {
				function Consumer() {
					const [dismissed, setDismissed] = useState(false);
					const headingRef = useRef<HTMLHeadingElement>(null);
					return (
						<>
							<h2 ref={headingRef} tabIndex={-1}>
								Settings
							</h2>
							{!dismissed && (
								<Alert.Root intent="info">
									<Alert.Content>
										<Alert.Title>Trial ends soon</Alert.Title>
										<Alert.DismissIconButton
											onClick={() => {
												setDismissed(true);
												headingRef.current?.focus();
											}}
										/>
									</Alert.Content>
								</Alert.Root>
							)}
							<button type="button">After</button>
						</>
					);
				}
				const user = userEvent.setup();
				render(<Consumer />);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.getByRole("heading", { name: "Settings" })).toHaveFocus();
			});

			test("keeps focus a consumer layout effect places after the unmount", async () => {
				function Consumer() {
					const [dismissed, setDismissed] = useState(false);
					const statusRef = useRef<HTMLParagraphElement>(null);
					useLayoutEffect(() => {
						if (dismissed) {
							statusRef.current?.focus();
						}
					}, [dismissed]);
					return (
						<>
							{!dismissed && (
								<Alert.Root intent="info">
									<Alert.Content>
										<Alert.Title>Trial ends soon</Alert.Title>
										<Alert.DismissIconButton onClick={() => setDismissed(true)} />
									</Alert.Content>
								</Alert.Root>
							)}
							<p ref={statusRef} tabIndex={-1}>
								Alert dismissed
							</p>
							<button type="button">After</button>
						</>
					);
				}
				const user = userEvent.setup();
				render(<Consumer />);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.getByText("Alert dismissed")).toHaveFocus();
				expect(screen.getByRole("button", { name: "After" })).not.toHaveFocus();
			});

			test("stays put when the composing context opts out", async () => {
				// `AlertCenter` projects the button under its own `AlertContextProvider`
				// and owns focus after a dismissal, so the button must not move it.
				function Projected() {
					const [dismissed, setDismissed] = useState(false);
					if (dismissed) {
						return null;
					}
					return (
						<AlertContextProvider intent="info" redirectDismissFocus={false}>
							<div data-slot="alert">
								<Alert.DismissIconButton onClick={() => setDismissed(true)} />
							</div>
						</AlertContextProvider>
					);
				}
				const user = userEvent.setup();
				render(
					<>
						<Projected />
						<button type="button">After</button>
					</>,
				);

				await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));

				expect(screen.queryByRole("button", { name: "Dismiss Alert" })).not.toBeInTheDocument();
				expect(document.body).toHaveFocus();
			});
		});
	});

	describe("ExpandButton", () => {
		test("reserves room for its count and rotates the caret when expanded", () => {
			const { container } = render(
				<Alert.Root
					intent="warning"
					style={$cssProperties({ "--alert-control-color": "var(--color-neutral-700)" })}
				>
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={2} expanded />
					</Alert.Content>
				</Alert.Root>,
			);

			expect(container.querySelector('[data-slot="alert-expand-button"]')).toHaveAttribute(
				"aria-expanded",
				"true",
			);
			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			expect(container.querySelector('[data-slot="alert-content"]')).not.toHaveClass(
				"has-data-alert-expand:pr-12",
			);
			expect(container.querySelector('[data-slot="alert-expand-button"] svg')).toHaveClass(
				"-rotate-180",
				"duration-150",
			);
			expect(container.querySelector('[data-slot="alert-expand-button"]')).toHaveClass(
				"top-1.5",
				"text-[var(--alert-control-color,currentColor)]",
				"not-disabled:hover:bg-[var(--alert-control-hover-bg,transparent)]",
				"not-disabled:hover:text-[var(--alert-control-hover-color,currentColor)]",
			);
			const root = container.querySelector('[data-slot="alert"]');
			expect(root?.getAttribute("style")).toContain("--alert-control-color");
			expect(root?.getAttribute("style")).toContain("--alert-control-hover-color");
			expect(root?.getAttribute("style")).toContain("--alert-control-hover-bg");
			expect(root?.getAttribute("style")).toContain(
				"--alert-control-color: var(--color-neutral-700)",
			);
		});

		test("gives the count a growable min-width so multi-digit counts don't overflow", () => {
			render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={10} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			const count = screen.getByText("+10");
			expect(count).toHaveClass("min-w-[2ch]");
			expect(count).not.toHaveClass("w-[2ch]");
		});

		test("renders the caret through Button's icon slot, outside the label", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={3} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			const button = container.querySelector('[data-slot="alert-expand-button"]');
			const label = button?.querySelector('[data-slot="button-label"]');
			const caret = button?.querySelector("svg");
			expect(label).toHaveTextContent("+3");
			// The caret is the label's sibling, not its descendant, so the button's
			// `gap` falls between the two and `iconPlacement="end"` orders the caret
			// last. Passing it as a child puts it inside the label instead.
			expect(caret?.parentElement).toBe(button);
			expect(label?.contains(caret ?? null)).toBe(false);
		});

		test("keeps the caret side tighter than the text side", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={3} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			// A tailwind-merge override contract. `Button` adds `pe-2` for the icon side
			// whenever `icon` is set, and a `px-*` shorthand cannot beat that longhand:
			// both survive the merge, and Tailwind emits `pe-*` last. Asserting the merge
			// outcome is what catches the caret drifting 2px away from the edge.
			const button = container.querySelector('[data-slot="alert-expand-button"]');
			expect(button).toHaveClass("ps-1.5", "pe-1");
			expect(button).not.toHaveClass("pe-2");
		});

		test("keeps the count and the word as flex items of the button", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={3} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			// A cross-file contract: `button.tsx` renders the label slot as
			// `display: contents`, which is where the `gap-1` between the count and the
			// word comes from. Give that slot a box and all three items run together.
			const button = container.querySelector('[data-slot="alert-expand-button"]');
			const label = button?.querySelector('[data-slot="button-label"]');
			expect(label).toHaveClass("contents");
			expect(label).toContainElement(screen.getByText("+3"));
		});

		test("`asChild` is not accepted at the type level", () => {
			const withAsChild = (
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						{/* @ts-expect-error -- asChild is omitted: ExpandButton renders multiple children */}
						<Alert.ExpandButton count={2} expanded={false} asChild />
					</Alert.Content>
				</Alert.Root>
			);
			expect(withAsChild).toBeDefined();
		});

		test("positions dismiss to the left and reserves both controls when composed together", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.DismissIconButton />
						<Alert.ExpandButton count={2} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-dismiss:pr-10",
				"has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-16",
				"md:has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-24",
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			expect(container.querySelector('[data-slot="alert-dismiss-icon-button"]')).toHaveClass(
				"top-1.5",
				"text-[var(--alert-control-color,currentColor)]",
				"not-disabled:hover:bg-[var(--alert-control-hover-bg,transparent)]",
				"not-disabled:hover:text-[var(--alert-control-hover-color,currentColor)]",
			);
		});
	});

	describe("appearance", () => {
		test(`appearance="banner" removes the rounded corners`, () => {
			const { container } = render(
				<Alert.Root intent="info" appearance="banner">
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(getAlertRoot(container)).toHaveClass("rounded-none");
		});
	});
});

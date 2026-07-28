import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { $cssProperties } from "../../types/index.js";
import { Alert } from "./alert.js";

function getAlertRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="alert"]');
}

/**
 * The `Alert.Root` element, narrowed to `HTMLElement` so its inline
 * `style` (where the public `--alert-control-*` variables live) is readable
 * without a type assertion.
 */
function getAlertRootElement(container: HTMLElement) {
	const root = getAlertRoot(container);
	if (!(root instanceof HTMLElement)) {
		throw new Error("Alert.Root did not render an HTMLElement");
	}
	return root;
}

/**
 * Type-level contract, owned by `pnpm typecheck` rather than vitest: making
 * `intent` optional on `Alert.Root` turns the directive below into an unused
 * `@ts-expect-error`, which is a compile error. It is deliberately not a
 * `test()` — no runtime assertion can observe a type, and a constant-true
 * `expect` would only claim otherwise.
 */
void (
	(
		// @ts-expect-error -- intent is required on Alert.Root
		<Alert.Root>
			<Alert.Content>
				<Alert.Title>Title</Alert.Title>
			</Alert.Content>
		</Alert.Root>
	)
);

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

	describe("intent", () => {
		// Class pins, deliberately: `intent` selects a cva class list and nothing
		// else — `Alert.Root` stamps no `data-intent`, so the tone class IS the
		// whole implementation of the body tone. The intent's other half (the
		// `--alert-control-*` values the trailing controls read) is asserted
		// through public API in the block below.
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
	});

	describe("control color variables", () => {
		test.each(["danger", "important", "info", "success", "warning"] as const)(
			`intent="%s" publishes the documented control color defaults`,
			(intent) => {
				// `--alert-control-*` are public API (documented in Alert.Root's JSDoc
				// and the docs page): the trailing controls read them, and consumers
				// override them.
				const { container } = render(
					<Alert.Root intent={intent}>
						<Alert.Content>
							<Alert.Title>Title</Alert.Title>
							<Alert.DismissIconButton />
						</Alert.Content>
					</Alert.Root>,
				);
				const root = getAlertRootElement(container);
				expect(root.style.getPropertyValue("--alert-control-color")).toBe(
					`var(--color-${intent}-700)`,
				);
				expect(root.style.getPropertyValue("--alert-control-hover-color")).toBe(
					`var(--color-${intent}-800)`,
				);
				expect(root.style.getPropertyValue("--alert-control-hover-bg")).toBe(
					`color-mix(in oklab, var(--color-${intent}-500) 10%, transparent)`,
				);
			},
		);

		test("a consumer's style wins over the intent defaults it names, and leaves the rest", () => {
			const { container } = render(
				<Alert.Root
					intent="warning"
					style={$cssProperties({ "--alert-control-color": "var(--color-neutral-700)" })}
				>
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.DismissIconButton />
					</Alert.Content>
				</Alert.Root>,
			);
			const root = getAlertRootElement(container);
			// merge order: Root spreads the consumer's `style` AFTER its own defaults
			expect(root.style.getPropertyValue("--alert-control-color")).toBe("var(--color-neutral-700)");
			expect(root.style.getPropertyValue("--alert-control-hover-color")).toBe(
				"var(--color-warning-800)",
			);
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
			// `data-alert-dismiss` is the hook every `has-data-alert-dismiss:*` rule
			// in Alert — and the bar's control centering in AlertCenter — selects on
			expect(button).toHaveAttribute("data-alert-dismiss");
			await userEvent.click(button);
			expect(onDismiss).toHaveBeenCalledTimes(1);
		});
	});

	describe("ExpandButton", () => {
		test("reserves room for its count and rotates the caret when expanded", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={2} expanded />
					</Alert.Content>
				</Alert.Root>,
			);

			const expand = screen.getByRole("button", { name: "Collapse additional alerts" });
			expect(expand).toHaveAttribute("aria-expanded", "true");
			// `data-alert-expand` is the hook the root's reservation rules below —
			// and AlertCenter's bar control centering — select on
			expect(expand).toHaveAttribute("data-alert-expand");
			// Spelling pin, both sides in one render: the root's reservation
			// variants only fire against the attribute asserted above and the
			// `data-slot` Alert.Content stamps, so renaming either silently drops
			// the padding that keeps the title clear of the control.
			expect(container.querySelector('[data-slot="alert-content"]')).toBeInTheDocument();
			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			// Class pin: the caret's rotation is the only signal that the control
			// is expanded beyond `aria-expanded` above, and the caret carries no
			// data attribute of its own.
			expect(container.querySelector('[data-slot="alert-expand-button"] svg')).toHaveClass(
				"-rotate-180",
			);
		});

		test("leaves the caret unrotated while collapsed", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={2} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);
			expect(screen.getByRole("button", { name: "Show 2 more alerts" })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
			expect(container.querySelector('[data-slot="alert-expand-button"] svg')).not.toHaveClass(
				"-rotate-180",
			);
		});

		test.each([
			{ count: 1, expanded: false, name: "Show 1 more alert" },
			{ count: 4, expanded: false, name: "Show 4 more alerts" },
			{ count: 4, expanded: true, name: "Collapse additional alerts" },
			// multi-digit counts keep the plural and render every digit — the count
			// span is sized to grow rather than clip
			{ count: 10, expanded: false, name: "Show 10 more alerts" },
		])(
			`derives its accessible name and count for count=$count, expanded=$expanded`,
			async ({ count, expanded, name }) => {
				const onToggle = vi.fn<() => void>();
				render(
					<Alert.Root intent="warning">
						<Alert.Content>
							<Alert.Title>Usage limit approaching</Alert.Title>
							<Alert.ExpandButton count={count} expanded={expanded} onClick={onToggle} />
						</Alert.Content>
					</Alert.Root>,
				);

				const expand = screen.getByRole("button", { name });
				expect(expand).toHaveAttribute("aria-expanded", String(expanded));
				expect(expand).toHaveTextContent(`+${count}`);
				await userEvent.click(expand);
				expect(onToggle).toHaveBeenCalledTimes(1);
			},
		);

		test("`asChild` is unrepresentable: its three children would trip Button's invariant", () => {
			// React logs the failed render before rethrowing — the invariant is the
			// runtime reason `asChild` is omitted from the prop type.
			vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() =>
				render(
					<Alert.Root intent="warning">
						<Alert.Content>
							<Alert.Title>Usage limit approaching</Alert.Title>
							{/* @ts-expect-error -- asChild is omitted: ExpandButton renders multiple children */}
							<Alert.ExpandButton count={2} expanded={false} asChild />
						</Alert.Content>
					</Alert.Root>,
				),
			).toThrow("When using `asChild`, Button must be passed a single child as a JSX tag.");
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

			// both controls advertise themselves to the root's reservation rules
			expect(screen.getByRole("button", { name: "Dismiss Alert" })).toHaveAttribute(
				"data-alert-dismiss",
			);
			expect(screen.getByRole("button", { name: "Show 2 more alerts" })).toHaveAttribute(
				"data-alert-expand",
			);
			// Spelling pins, both sides in one render: each variant below keys off an
			// attribute or `data-slot` asserted in this same test, so a rename on
			// either side silently un-reserves the trailing control's space.
			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-dismiss:pr-10",
				"has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-16",
				"md:has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-24",
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			// the other half of the documented CSS-variable contract: Root publishes
			// the values, and the control's color declarations read them back
			const root = getAlertRootElement(container);
			expect(root.style.getPropertyValue("--alert-control-color")).toBe("var(--color-warning-700)");
			expect(container.querySelector('[data-slot="alert-dismiss-icon-button"]')).toHaveClass(
				"text-[var(--alert-control-color,currentColor)]",
				"not-disabled:hover:bg-[var(--alert-control-hover-bg,transparent)]",
				"not-disabled:hover:text-[var(--alert-control-hover-color,currentColor)]",
			);
		});
	});

	describe("appearance", () => {
		// Class pin: `appearance` is documented as a purely visual variant and
		// stamps no data attribute, so its class list is the only observable — and
		// happy-dom loads no Tailwind to compute the geometry from.
		test(`appearance="banner" drops the rounded corners and side borders and sticks`, () => {
			const { container } = render(
				<Alert.Root intent="info" appearance="banner">
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(getAlertRoot(container)).toHaveClass(
				"rounded-none",
				"border-x-0",
				"border-t-0",
				"sticky",
			);
			// `toHaveClass` ignores extras, so the variant's `rounded-none` proves
			// nothing unless the base `rounded-md` it must beat is gone — that
			// merge, not the class list, is what squares the banner's corners
			expect(getAlertRoot(container)).not.toHaveClass("rounded-md");
		});
	});
});

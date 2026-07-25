import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { Tabs } from "./tabs.js";

const noPreferenceQuery = "(prefers-reduced-motion: no-preference)";

const orientations = ["horizontal", "vertical"] as const;
const appearances = ["classic", "pill"] as const;

describe("Tabs", () => {
	describe("Root", () => {
		// data-appearance is a public styling hook (SSR-friendly alternative to
		// reading context) — consumer CSS like [data-appearance="pill"] relies on it.
		test.each(appearances)(
			"renders data-appearance=%s for appearance-scoped styling",
			(appearance) => {
				const { container } = render(
					<Tabs.Root appearance={appearance} orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
					"data-appearance",
					appearance,
				);
			},
		);

		// Root's `orientation` is plumbed to the tablist through context, not through
		// Radix, so the tablist's aria-orientation — what tells assistive tech (and
		// Radix's roving focus) which arrow keys move between tabs — depends on that
		// wiring being right.
		test.each(orientations)(
			"flows orientation=%s to the root element and the tablist",
			(orientation) => {
				const { container } = render(
					<Tabs.Root orientation={orientation} defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="a">Panel A</Tabs.Content>
					</Tabs.Root>,
				);

				expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
					"data-orientation",
					orientation,
				);
				expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", orientation);
			},
		);
	});

	describe("List", () => {
		const renderList = ({
			orientation,
			appearance,
			hideBorder,
		}: {
			orientation: (typeof orientations)[number];
			appearance: (typeof appearances)[number];
			hideBorder: boolean;
		}) =>
			render(
				<Tabs.Root appearance={appearance} orientation={orientation} defaultValue="a">
					<Tabs.List hideBorder={hideBorder}>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

		// `data-hide-border` is the documented public form of the `hideBorder` prop —
		// it's what consumer CSS targets — and it is deliberately orientation- and
		// appearance-independent, including on the pill appearance where the prop
		// itself is a documented no-op.
		const hideBorderCases = orientations.flatMap((orientation) =>
			appearances.flatMap((appearance) => [
				{ orientation, appearance, hideBorder: true, dataHideBorder: "" },
				// `null` means the attribute is absent, not empty.
				{ orientation, appearance, hideBorder: false, dataHideBorder: null },
			]),
		);

		test.each(hideBorderCases)(
			"a $orientation $appearance tablist renders hideBorder=$hideBorder as data-hide-border",
			({ dataHideBorder, ...listProps }) => {
				renderList(listProps);

				expect(screen.getByRole("tablist").getAttribute("data-hide-border")).toBe(dataHideBorder);
			},
		);

		// The border is painted entirely by a class — there is no attribute that says
		// "the border is drawn" — so one marker class per orientation stands in for it
		// here: `bg-origin-content` for the horizontal background-painted rule, and
		// `border-r` for the vertical side border. Worth pinning because the compound
		// variants those come from match by strict equality: dropping
		// `defaultVariants.hideBorder` from `listVariants` stops matching the
		// `hideBorder: false` compounds and silently loses the border from every
		// default tablist, which nothing else in happy-dom can see.
		const borderPaintCases: ReadonlyArray<{
			orientation: (typeof orientations)[number];
			appearance: (typeof appearances)[number];
			hideBorder: boolean;
			borderClass: string;
			drawn: boolean;
		}> = [
			{
				orientation: "horizontal",
				appearance: "classic",
				hideBorder: false,
				borderClass: "bg-origin-content",
				drawn: true,
			},
			{
				orientation: "horizontal",
				appearance: "classic",
				hideBorder: true,
				borderClass: "bg-origin-content",
				drawn: false,
			},
			{
				orientation: "horizontal",
				appearance: "pill",
				hideBorder: false,
				borderClass: "bg-origin-content",
				drawn: false,
			},
			{
				orientation: "vertical",
				appearance: "classic",
				hideBorder: false,
				borderClass: "border-r",
				drawn: true,
			},
			{
				orientation: "vertical",
				appearance: "classic",
				hideBorder: true,
				borderClass: "border-r",
				drawn: false,
			},
			{
				orientation: "vertical",
				appearance: "pill",
				hideBorder: false,
				borderClass: "border-r",
				drawn: false,
			},
		];

		test.each(borderPaintCases)(
			"a $orientation $appearance tablist with hideBorder=$hideBorder draws its border: $drawn",
			({ borderClass, drawn, ...listProps }) => {
				renderList(listProps);

				expect(screen.getByRole("tablist").classList.contains(borderClass)).toBe(drawn);
			},
		);

		// Cross-file pin. `scroll-fade-x` is a mantle.css `@utility`, not a Tailwind
		// built-in: it owns the mask that fades the overflowing edges of the scrolling
		// tablist, and it reads `--_fade-bottom-border` to hold the classic
		// appearance's 1px border row opaque inside that mask. Both halves are emitted
		// here while the selector consuming them lives in mantle.css, and no happy-dom
		// computed style can observe a mask — so the two spellings are the contract,
		// and renaming one side without the other fades the border out at the scroll
		// edges with every other test still green.
		test.each(appearances)(
			"a horizontal %s tablist opts into the scroll-fade-x mask",
			(appearance) => {
				renderList({ orientation: "horizontal", appearance, hideBorder: false });

				expect(screen.getByRole("tablist")).toHaveClass("scroll-fade-x");
			},
		);

		test("a horizontal classic tablist pins its border row opaque in the scroll-fade mask", () => {
			renderList({ orientation: "horizontal", appearance: "classic", hideBorder: false });

			expect(screen.getByRole("tablist")).toHaveClass(
				"scroll-fade-x",
				"[--_fade-bottom-border:black]",
			);
		});

		// A horizontal tablist is a scroll container, and Radix's arrow-key roving
		// focus just calls element.focus(), which doesn't scroll inside an overflow
		// container. List compensates with a delegated `focusin` listener.
		test("scrolls a newly focused trigger into view in a horizontal tablist", async () => {
			mockMatchMedia({ [noPreferenceQuery]: true });
			const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
			const user = userEvent.setup();
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();

			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
			expect(scrollIntoView).toHaveBeenCalledTimes(1);
			// "center" (not "nearest") so the focused tab lands mid-viewport with
			// context on both sides; "smooth" because motion is allowed here.
			expect(scrollIntoView).toHaveBeenLastCalledWith({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
		});

		test("honors prefers-reduced-motion by scrolling the focused trigger instantly", async () => {
			mockMatchMedia({ [noPreferenceQuery]: false });
			const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
			const user = userEvent.setup();
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();

			expect(scrollIntoView).toHaveBeenCalledTimes(1);
			expect(scrollIntoView).toHaveBeenLastCalledWith({
				behavior: "auto",
				inline: "center",
				block: "nearest",
			});
		});

		// A vertical tablist isn't a scroll container, so the listener is never
		// registered — focusing a trigger must not scroll the page.
		test("does not scroll a focused trigger into view in a vertical tablist", async () => {
			mockMatchMedia({ [noPreferenceQuery]: true });
			const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
			const user = userEvent.setup();
			render(
				<Tabs.Root orientation="vertical" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();

			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
			expect(scrollIntoView).not.toHaveBeenCalled();
		});
	});

	describe("Trigger", () => {
		test("marks each trigger with data-slot and prepends the active-state decoration", () => {
			render(
				<Tabs.Root appearance="classic" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a">Panel A</Tabs.Content>
				</Tabs.Root>,
			);

			const trigger = screen.getByRole("tab", { name: "Tab A" });
			expect(trigger).toHaveAttribute("data-slot", "tabs-trigger");

			// The decoration is the element that paints the selected-tab underline, so
			// it must exist and must be the trigger's first child (it is absolutely
			// positioned behind the label) and hidden from the a11y tree.
			const decoration = trigger.firstElementChild;
			expect(decoration?.tagName).toBe("SPAN");
			expect(decoration).toHaveAttribute("aria-hidden", "true");
			expect(trigger).toHaveTextContent("Tab A");
		});

		// The pill appearance paints its selected state on the trigger itself, so the
		// underline decoration must be display:none there. `hidden` is asserted as a
		// spelling pin because the decoration has no other observable difference.
		test("hides the decoration in the pill appearance and shows it in the classic one", () => {
			const { unmount } = render(
				<Tabs.Root appearance="pill" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);
			expect(screen.getByRole("tab", { name: "Tab A" }).firstElementChild).toHaveClass("hidden");
			unmount();

			render(
				<Tabs.Root appearance="classic" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);
			expect(screen.getByRole("tab", { name: "Tab A" }).firstElementChild).not.toHaveClass(
				"hidden",
			);
		});

		test("switching tabs moves aria-selected and swaps the rendered panel", async () => {
			const user = userEvent.setup();
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a">Panel A</Tabs.Content>
					<Tabs.Content value="b">Panel B</Tabs.Content>
				</Tabs.Root>,
			);

			await user.click(screen.getByRole("tab", { name: "Tab B" }));

			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "false");
			expect(screen.getByText("Panel B")).toBeInTheDocument();
			expect(screen.queryByText("Panel A")).not.toBeInTheDocument();
		});

		// `disabled` is derived with `parseBooleanish(ariaDisabled ?? disabled)`, so an
		// explicit `aria-disabled` always wins — including `aria-disabled={false}`,
		// which keeps the tab enabled even alongside `disabled`.
		const disabledCases: ReadonlyArray<{
			name: string;
			props: Pick<ComponentProps<typeof Tabs.Trigger>, "aria-disabled" | "disabled">;
			disabled: boolean;
			ariaDisabled: string | null;
		}> = [
			{ name: "disabled", props: { disabled: true }, disabled: true, ariaDisabled: "true" },
			{
				name: "aria-disabled={true}",
				props: { "aria-disabled": true },
				disabled: true,
				ariaDisabled: "true",
			},
			{
				name: 'aria-disabled="true"',
				props: { "aria-disabled": "true" },
				disabled: true,
				ariaDisabled: "true",
			},
			{
				name: 'aria-disabled="false"',
				props: { "aria-disabled": "false" },
				disabled: false,
				ariaDisabled: "false",
			},
			{
				name: "aria-disabled={false} beats disabled",
				props: { "aria-disabled": false, disabled: true },
				disabled: false,
				ariaDisabled: "false",
			},
			{ name: "neither", props: {}, disabled: false, ariaDisabled: null },
		];

		test.each(disabledCases)(
			"coerces the disabled state from $name",
			({ props, disabled, ariaDisabled }) => {
				render(
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
							<Tabs.Trigger value="b" {...props}>
								Tab B
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				const trigger = screen.getByRole("tab", { name: "Tab B" });
				if (!(trigger instanceof HTMLButtonElement)) {
					throw new Error("expected the trigger to render a <button>");
				}
				expect(trigger.disabled).toBe(disabled);
				// `null` means the attribute is absent — the trigger only forwards
				// `aria-disabled` when the consumer supplied one of the two props.
				expect(trigger.getAttribute("aria-disabled")).toBe(ariaDisabled);
			},
		);

		test("clicking a disabled trigger leaves the selected panel unchanged", async () => {
			const user = userEvent.setup();
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b" disabled>
							Tab B
						</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a">Panel A</Tabs.Content>
					<Tabs.Content value="b">Panel B</Tabs.Content>
				</Tabs.Root>,
			);

			await user.click(screen.getByRole("tab", { name: "Tab B" }));

			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByText("Panel A")).toBeInTheDocument();
			expect(screen.queryByText("Panel B")).not.toBeInTheDocument();
		});

		describe("asChild", () => {
			test("renders the child element, keeps its label, and makes it keyboard reachable", () => {
				render(
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a" asChild>
								<a href="/account">Account</a>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				const trigger = screen.getByRole("tab", { name: "Account" });
				expect(trigger.tagName).toBe("A");
				expect(trigger).toHaveAttribute("href", "/account");
				// asChild anchors get an explicit tabIndex so they stay keyboard reachable.
				expect(trigger).toHaveAttribute("tabindex", "0");
				expect(trigger).toHaveAttribute("data-slot", "tabs-trigger");
				// The child's own children are re-parented under the decoration, so the
				// label must survive the clone.
				expect(trigger).toHaveTextContent("Account");
				expect(trigger.firstElementChild).toHaveAttribute("aria-hidden", "true");
			});

			// `<a>` ignores the `disabled` attribute, so a disabled routing tab must be
			// swapped for a real <button> — otherwise it stays navigable.
			test("swaps a disabled child for a non-navigable button", async () => {
				const user = userEvent.setup();
				render(
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a" asChild>
								<a href="/account">Account</a>
							</Tabs.Trigger>
							<Tabs.Trigger value="b" disabled asChild>
								<a href="/password">Password</a>
							</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="a">Panel A</Tabs.Content>
						<Tabs.Content value="b">Panel B</Tabs.Content>
					</Tabs.Root>,
				);

				const disabledTrigger = screen.getByRole("tab", { name: "Password" });
				expect(disabledTrigger.tagName).toBe("BUTTON");
				expect(disabledTrigger).not.toHaveAttribute("href");
				expect(disabledTrigger).toHaveAttribute("disabled");
				expect(disabledTrigger).toHaveAttribute("aria-disabled", "true");
				expect(disabledTrigger).toHaveTextContent("Password");

				await user.click(disabledTrigger);

				expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute(
					"aria-selected",
					"true",
				);
				expect(screen.queryByText("Panel B")).not.toBeInTheDocument();
			});

			test("fails fast when asChild receives something other than a single element", () => {
				// A text child never reaches the component's own invariant — `Children.only`
				// rejects it first — but either way asChild must fail loudly at the call
				// site rather than silently dropping the trigger's props.
				expect(() =>
					render(
						<Tabs.Root defaultValue="a">
							<Tabs.List>
								<Tabs.Trigger value="a" asChild>
									Account
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs.Root>,
					),
				).toThrow(/single React element|single child as a JSX tag/);

				expect(() =>
					render(
						<Tabs.Root defaultValue="a">
							<Tabs.List>
								<Tabs.Trigger value="a" asChild>
									<a href="/account">Account</a>
									<a href="/password">Password</a>
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs.Root>,
					),
				).toThrow(/single React element|single child as a JSX tag/);
			});
		});
	});

	describe("Badge", () => {
		test("renders inside its trigger and joins the trigger's accessible name", () => {
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">
							Notifications <Tabs.Badge>5</Tabs.Badge>
						</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a">Panel A</Tabs.Content>
				</Tabs.Root>,
			);

			// The count has to reach the accessible name — a badge announced as a bare
			// "Notifications" tab loses the information it exists to convey.
			const trigger = screen.getByRole("tab", { name: "Notifications 5" });
			const badge = trigger.querySelector('[data-slot="tabs-badge"]');
			expect(badge).toHaveTextContent("5");
		});
	});

	describe("Content", () => {
		test("marks the active panel with data-slot and renders only its children", () => {
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a">Panel A</Tabs.Content>
					<Tabs.Content value="b">Panel B</Tabs.Content>
				</Tabs.Root>,
			);

			const panel = screen.getByRole("tabpanel");
			expect(panel).toHaveAttribute("data-slot", "tabs-content");
			expect(panel).toHaveTextContent("Panel A");
			expect(panel).toHaveAccessibleName("Tab A");
			expect(screen.queryByText("Panel B")).not.toBeInTheDocument();
		});
	});
});

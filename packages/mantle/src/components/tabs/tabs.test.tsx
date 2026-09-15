import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Tabs } from "./tabs.js";

describe("Tabs", () => {
	describe("Root", () => {
		// data-appearance is a public styling hook (SSR-friendly alternative to
		// reading context) — consumer CSS like [data-appearance="pill"] relies on it.
		test.each(["classic", "pill"] as const)(
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
	});

	describe("List", () => {
		test("a callback ref on Tabs.List fires once with the tablist across a re-render", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			// Why a factory: React bails out of a re-render when it receives the same
			// element object, so each render needs fresh elements with the same props.
			const renderTree = () => (
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List ref={refSpy}>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			);
			const { rerender } = render(renderTree());
			rerender(renderTree());

			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(screen.getByRole("tablist"));
		});

		// scroll-fade-x lives on the shared horizontal-orientation variant, so both
		// appearances inherit it. This guards against a regression that would scope
		// the overflow handling to only the classic appearance.
		test.each(["classic", "pill"] as const)(
			"horizontal %s appearance scrolls on overflow with scroll-fade-x",
			(appearance) => {
				render(
					<Tabs.Root appearance={appearance} orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
							<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				expect(screen.getByRole("tablist")).toHaveClass(
					"scroll-fade-x",
					"overflow-x-auto",
					"min-w-0",
				);
			},
		);

		// The bottom border is on by default for the classic appearance, painted
		// as a content-box background in the separator color so the px-1/-mx-1
		// focus-ring breathing room doesn't push it past the container edges;
		// --_fade-bottom-border pins the border row opaque in the scroll-fade mask.
		test("horizontal classic appearance draws the bottom border by default", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("bg-origin-content", "pb-px", "[--_fade-bottom-border:black]");
			expect(tablist).not.toHaveAttribute("data-hide-border");
		});

		test("hideBorder removes the border paint and renders data-hide-border", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("bg-origin-content");
			expect(tablist).not.toHaveClass("pb-px");
			expect(tablist).toHaveAttribute("data-hide-border");
		});

		test("horizontal pill appearance never draws the bottom border", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).not.toHaveClass("bg-origin-content");
		});

		// hideBorder is documented as a no-op for pill (which never draws a
		// border), but the data attribute still renders appearance-independently.
		test("hideBorder on the pill appearance is a no-op but still renders data-hide-border", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("bg-origin-content");
			expect(tablist).not.toHaveClass("pb-px");
			expect(tablist).toHaveAttribute("data-hide-border");
		});

		test("vertical classic appearance draws the side border by default with the separator token", () => {
			render(
				<Tabs.Root appearance="classic" orientation="vertical" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).toHaveClass("border-r", "border-separator");
		});

		test("hideBorder removes the vertical classic side border", () => {
			render(
				<Tabs.Root appearance="classic" orientation="vertical" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("border-r");
			expect(tablist).toHaveAttribute("data-hide-border");
		});

		// Regression: a pointer press focused the trigger, the list scrolled it to
		// the center, and the click landed on empty space, so an asChild link
		// never navigated.
		test("a pointer click on a trigger does not scroll it into view and still fires onClick", async () => {
			const user = userEvent.setup();
			const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
			const onClick = vi.fn<() => void>();
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b" onClick={onClick}>
							Tab B
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.click(screen.getByRole("tab", { name: "Tab B" }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
			expect(scrollIntoView).not.toHaveBeenCalled();
		});

		test("keyboard focus scrolls the trigger into view", async () => {
			const user = userEvent.setup();
			const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
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
			expect(scrollIntoView).toHaveBeenLastCalledWith(
				expect.objectContaining({ inline: "center", block: "nearest" }),
			);

			await user.keyboard("{ArrowRight}");
			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
			expect(scrollIntoView).toHaveBeenCalledTimes(2);
		});
	});

	describe("Trigger", () => {
		// Regression: a cloned `tabIndex: 0` won over Radix's roving `tabIndex`, so
		// every asChild tab was a Tab stop instead of only the active one.
		test("asChild keeps Radix's roving tabIndex so only the active tab is a Tab stop", async () => {
			const user = userEvent.setup();
			render(
				<>
					<Tabs.Root orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a" asChild>
								<a href="/a">Tab A</a>
							</Tabs.Trigger>
							<Tabs.Trigger value="b" asChild>
								<a href="/b">Tab B</a>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
					<button type="button">After</button>
				</>,
			);

			const tabA = screen.getByRole("tab", { name: "Tab A" });
			const tabB = screen.getByRole("tab", { name: "Tab B" });
			expect(tabA.tagName).toBe("A");
			expect(tabB).toHaveAttribute("tabindex", "-1");

			await user.tab();
			expect(tabA).toHaveFocus();
			expect(tabA).toHaveAttribute("tabindex", "0");
			expect(tabB).toHaveAttribute("tabindex", "-1");

			// The inactive tab is not a Tab stop, so Tab leaves the list.
			await user.tab();
			expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
		});

		test("a disabled asChild link drops its href and cannot be activated", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<() => void>();
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b" asChild disabled onClick={onClick}>
							<a href="/b">Tab B</a>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tabB = screen.getByRole("tab", { name: "Tab B" });
			expect(tabB).not.toHaveAttribute("href");
			expect(tabB).toHaveAttribute("aria-disabled", "true");
			await user.click(tabB);
			expect(onClick).not.toHaveBeenCalled();
			expect(tabB).toHaveAttribute("aria-selected", "false");
		});
		test.each([{ asChild: false }, { asChild: true }])(
			"wraps children in the label slot (asChild: $asChild)",
			({ asChild }) => {
				render(
					<Tabs.Root orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a" asChild={asChild}>
								{asChild ? <a href="/a">Tab A</a> : "Tab A"}
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				const trigger = screen.getByRole("tab", { name: "Tab A" });
				const label = trigger.querySelector('[data-slot="tabs-trigger-label"]');
				expect(label).toHaveTextContent("Tab A");
				expect(label).toHaveClass("contents");
			},
		);

		test("keeps rendering when a translated label swaps to an element", () => {
			const renderTree = (label: ReactNode) => (
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">{label}</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			);
			const { rerender } = render(renderTree("Tab A"));
			const trigger = screen.getByRole("tab");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[Tab A-es]");

			rerender(renderTree(<strong>Tab A</strong>));

			expect(trigger.querySelector("font")).toBeNull();
			expect(trigger.querySelector("strong")).toHaveTextContent("Tab A");
		});

		test("keeps rendering when a translated asChild label swaps to an element", () => {
			const renderTree = (label: ReactNode) => (
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a" asChild>
							<a href="/a">{label}</a>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			);
			const { rerender } = render(renderTree("Tab A"));
			const trigger = screen.getByRole("tab");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[Tab A-es]");

			rerender(renderTree(<strong>Tab A</strong>));

			expect(trigger.querySelector("font")).toBeNull();
			expect(trigger.querySelector("strong")).toHaveTextContent("Tab A");
		});

		test("sizes a raw svg child through the label-scoped selector", () => {
			// Cross-file pin: the `[&>[data-slot=tabs-trigger-label]>svg]` utility in
			// `triggerVariants` only matches while the label span carries that slot
			// and the svg stays its direct child.
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">
							<svg data-testid="glyph" />
							Tab A
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const trigger = screen.getByRole("tab");
			expect(trigger.className).toContain("[&>[data-slot=tabs-trigger-label]>svg]:size-5");
			const label = trigger.querySelector('[data-slot="tabs-trigger-label"]');
			expect(label).toContainElement(screen.getByTestId("glyph"));
			expect(screen.getByTestId("glyph").parentElement).toBe(label);
		});

		test("stops merging a consumer's own [&>svg] override away", () => {
			// tailwind-merge override contract. Moving the default off the `[&>svg]`
			// variant prefix puts it in a different conflict group, so a consumer's
			// `[&>svg]:size-4` survives instead of replacing the default. Both classes
			// have to reach the DOM, and the consumer's now matches nothing — which is
			// the migration the changeset names.
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a" className="[&>svg]:size-4">
							Tab A
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const trigger = screen.getByRole("tab");
			expect(trigger.className).toContain("[&>svg]:size-4");
			expect(trigger.className).toContain("[&>[data-slot=tabs-trigger-label]>svg]:size-5");
		});

		test("lets the matching slot-scoped override replace the default", () => {
			// The migration the changeset recommends. Same variant prefix, so
			// tailwind-merge drops the default instead of shipping both — which is
			// what a `[&_svg]` override cannot do, because it also loses on
			// specificity to the trigger's extra attribute selector.
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a" className="[&>[data-slot=tabs-trigger-label]>svg]:size-4">
							Tab A
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const trigger = screen.getByRole("tab");
			expect(trigger.className).toContain("[&>[data-slot=tabs-trigger-label]>svg]:size-4");
			expect(trigger.className).not.toContain("[&>[data-slot=tabs-trigger-label]>svg]:size-5");
		});
	});
});

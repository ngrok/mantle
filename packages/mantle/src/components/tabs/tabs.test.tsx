import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
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

		// Why class assertions: `aria-orientation` reads the prop, not the lookup
		// entry, so the classes are the only observable of the shared horizontal
		// entry. The pill row is the one that turns red when the overflow classes
		// move into the classic compound.
		test("the horizontal pill appearance inherits the shared scroll-fade-x overflow handling", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
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
		});

		// Regression: a pointer press focused the trigger, the list scrolled it to
		// the center, and the click landed on empty space, so an asChild link
		// never navigated.
		test("a pointer click on a trigger does not scroll it into view and still fires onClick", async () => {
			const user = userEvent.setup();
			// Why a spy: happy-dom lays out nothing, so the `scrollIntoView` call is the
			// only observable of the scroll.
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
			// Why a spy: happy-dom lays out nothing, so the `scrollIntoView` call is the
			// only observable of the scroll.
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
				expect.objectContaining({ behavior: "smooth", inline: "center", block: "nearest" }),
			);

			await user.keyboard("{ArrowRight}");
			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
			expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
			expect(scrollIntoView).toHaveBeenCalledTimes(2);
		});

		test("given prefers-reduced-motion, keyboard focus scrolls without animation", async () => {
			const user = userEvent.setup();
			// Why `false`: `getPrefersReducedMotion` inverts the `no-preference` match, so a miss means reduced motion.
			mockMatchMedia({ "(prefers-reduced-motion: no-preference)": false });
			// Why a spy: happy-dom lays out nothing, so the `scrollIntoView` call is the
			// only observable of the scroll.
			const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();

			expect(scrollIntoView).toHaveBeenCalledTimes(1);
			expect(scrollIntoView).toHaveBeenLastCalledWith(
				expect.objectContaining({ behavior: "auto" }),
			);
		});
	});

	describe("data-slot", () => {
		type SlotCase = {
			name: string;
			slot: string;
			render: (probe: { "data-slot": string; "data-testid": string }) => ReactNode;
		};
		// Every part joins an incoming `data-slot` chain ancestors-first, so an
		// `asChild` ancestor's slot survives beside the part's own.
		const cases: Array<SlotCase> = [
			{
				name: "Root",
				slot: "tabs",
				render: (probe) => <Tabs.Root defaultValue="a" {...probe} />,
			},
			{
				name: "List",
				slot: "tabs-list",
				render: (probe) => (
					<Tabs.Root defaultValue="a">
						<Tabs.List {...probe} />
					</Tabs.Root>
				),
			},
			{
				name: "Separator",
				slot: "tabs-separator",
				render: (probe) => (
					<Tabs.Root defaultValue="a">
						<Tabs.Separator {...probe} />
					</Tabs.Root>
				),
			},
			{
				name: "Trigger",
				slot: "tabs-trigger",
				render: (probe) => (
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a" {...probe}>
								Tab A
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				),
			},
			{
				name: "Badge",
				slot: "tabs-badge",
				render: (probe) => (
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">
								Tab A <Tabs.Badge {...probe}>5</Tabs.Badge>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				),
			},
			{
				name: "Content",
				slot: "tabs-content",
				render: (probe) => (
					<Tabs.Root defaultValue="a">
						<Tabs.Content value="a" {...probe}>
							Panel A
						</Tabs.Content>
					</Tabs.Root>
				),
			},
		];

		test.each(cases)(
			"$name joins its slot after an ancestor's chain",
			({ slot, render: renderPart }) => {
				render(renderPart({ "data-slot": "shell", "data-testid": "part" }));
				expect(screen.getByTestId("part")).toHaveAttribute("data-slot", `shell ${slot}`);
			},
		);
	});

	describe("Separator", () => {
		test.each(["horizontal", "vertical"] as const)(
			"follows the root's %s orientation and names its slot",
			(orientation) => {
				const { container } = render(
					<Tabs.Root orientation={orientation} defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Separator />
						<Tabs.Content value="a">Panel A</Tabs.Content>
					</Tabs.Root>,
				);

				const separator = container.querySelector('[data-slot="tabs-separator"]');
				expect(separator).toHaveAttribute("data-orientation", orientation);
				expect(separator).toHaveAttribute("data-separator");
			},
		);

		test("is decorative until semantic", () => {
			const { container, rerender } = render(
				<Tabs.Root defaultValue="a">
					<Tabs.Separator />
				</Tabs.Root>,
			);
			expect(container.querySelector('[data-slot="tabs-separator"]')).toHaveAttribute(
				"role",
				"none",
			);

			rerender(
				<Tabs.Root defaultValue="a">
					<Tabs.Separator semantic />
				</Tabs.Root>,
			);
			expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "tabs-separator");
		});

		test("merges the consumer's className and ref onto the separator element", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			const { container } = render(
				<Tabs.Root defaultValue="a">
					<Tabs.Separator className="my-2" ref={refSpy} />
				</Tabs.Root>,
			);

			const separator = container.querySelector('[data-slot="tabs-separator"]');
			expect(separator).toHaveClass("my-2");
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(separator);
		});

		test("asChild renders the child and merges the slot, classes, data attributes, and ref", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			render(
				<Tabs.Root orientation="vertical" defaultValue="a">
					<Tabs.Separator asChild className="my-2" data-testid="rule" ref={refSpy}>
						<hr />
					</Tabs.Separator>
				</Tabs.Root>,
			);

			const rule = screen.getByTestId("rule");
			expect(rule.tagName).toBe("HR");
			expect(rule).toHaveAttribute("data-slot", "tabs-separator");
			expect(rule).toHaveAttribute("data-orientation", "vertical");
			expect(rule).toHaveClass("my-2");
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(rule);
		});

		test("throws when rendered outside Tabs.Root", () => {
			// Why: silence React's error log for the expected throw.
			vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => render(<Tabs.Separator />)).toThrow(
				"Tabs.Separator must be rendered inside Tabs.Root.",
			);
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

		test("asChild renders the child and merges the slot, classes, data attributes, and ref", () => {
			const refSpy = vi.fn<(node: HTMLButtonElement | null) => void>();
			render(
				<Tabs.Root orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger
							value="a"
							asChild
							className="tracking-wide"
							data-testid="link"
							ref={refSpy}
						>
							<a href="/a">Tab A</a>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const link = screen.getByTestId("link");
			expect(link.tagName).toBe("A");
			expect(link).toHaveAttribute("role", "tab");
			expect(link).toHaveAttribute("data-slot", "tabs-trigger");
			expect(link).toHaveClass("tracking-wide");
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(link);
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

// Type-level contract: typecheck fails when a directive below goes unused.
// @ts-expect-error -- children need asChild
void (<Tabs.Separator>rule</Tabs.Separator>);
// @ts-expect-error -- asChild needs a child to clone
void (<Tabs.Separator asChild />);

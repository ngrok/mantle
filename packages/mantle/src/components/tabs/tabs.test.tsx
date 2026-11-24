import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as HeadlessTabs from "./headless-tabs-parts.js";
import * as Tabs from "./tabs-parts.js";

describe("Tabs", () => {
	describe("Root", () => {
		// data-appearance is a public styling hook (SSR-friendly alternative to
		// reading context). Consumer CSS like [data-appearance="pill"] relies on it.
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

		// Why: `orientation` reaches the tablist through mantle's context, and
		// `aria-orientation` tells assistive tech which arrow keys move between tabs.
		test.each(["horizontal", "vertical"] as const)(
			"flows orientation=%s to the root element and the tablist",
			(orientation) => {
				const { container } = render(
					<Tabs.Root orientation={orientation} defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
					"data-orientation",
					orientation,
				);
				expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", orientation);
			},
		);

		test("asChild renders the child and merges the slot, classes, data attributes, and ref", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			render(
				<Tabs.Root asChild orientation="vertical" defaultValue="a" className="shell" ref={refSpy}>
					<section data-testid="root">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
					</section>
				</Tabs.Root>,
			);

			const root = screen.getByTestId("root");
			// Why tagName: the asChild swap renders the child element in place of the default.
			expect(root.tagName).toBe("SECTION");
			expect(root).toHaveAttribute("data-slot", "tabs");
			expect(root).toHaveAttribute("data-orientation", "vertical");
			expect(root).toHaveAttribute("data-appearance", "classic");
			expect(root).toHaveClass("shell");
			expect(root).toContainElement(screen.getByRole("tablist"));
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(root);
		});
	});

	describe("Root onValueChange", () => {
		function ControlledTabs({ onValueChange }: { onValueChange: (value: string) => void }) {
			return (
				<Tabs.Root value="a" onValueChange={onValueChange}>
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			);
		}

		// Why mousedown: `useTabs` focuses the tab on mousedown, then selects it. Its
		// focus handler skips the pressed tab, so one press is one call.
		test("fires once per activation on a controlled root", () => {
			const onValueChange = vi.fn<(value: string) => void>();
			render(<ControlledTabs onValueChange={onValueChange} />);

			fireEvent.mouseDown(screen.getByRole("tab", { name: "Tab B" }));

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenLastCalledWith("b");
		});

		test("fires again for the same value on a later activation", async () => {
			const onValueChange = vi.fn<(value: string) => void>();
			render(<ControlledTabs onValueChange={onValueChange} />);

			fireEvent.mouseDown(screen.getByRole("tab", { name: "Tab B" }));
			// A consumer that keeps the old value sees the next press as a new request.
			await act(async () => {});
			fireEvent.mouseDown(screen.getByRole("tab", { name: "Tab B" }));

			expect(onValueChange).toHaveBeenCalledTimes(2);
		});
	});

	describe("Badge", () => {
		test("merges the consumer's className and ref onto the badge element", () => {
			const refSpy = vi.fn<(node: HTMLSpanElement | null) => void>();
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">
							Tab A
							<Tabs.Badge className="ml-2" ref={refSpy}>
								5
							</Tabs.Badge>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const badge = screen.getByText("5");
			expect(badge).toHaveAttribute("data-slot", "tabs-badge");
			expect(badge).toHaveClass("ml-2");
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(badge);
		});

		test("joins the trigger's accessible name", () => {
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">
							Notifications <Tabs.Badge>5</Tabs.Badge>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			// Why the name: a badge announced as a bare "Notifications" tab loses the
			// count it exists to convey.
			expect(screen.getByRole("tab", { name: "Notifications 5" })).toBeInTheDocument();
		});
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

		test("a press that the consumer cancels neither focuses nor activates the trigger", async () => {
			const user = userEvent.setup();
			const onMouseDown = vi.fn<(event: { preventDefault: () => void }) => void>((event) =>
				event.preventDefault(),
			);
			render(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b" onMouseDown={onMouseDown}>
							Tab B
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);
			const tab = screen.getByRole("tab", { name: "Tab B" });

			await user.click(tab);

			expect(onMouseDown).toHaveBeenCalledTimes(1);
			expect(tab).not.toHaveFocus();
			expect(tab).toHaveAttribute("aria-selected", "false");
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

		test("onKeyDown with preventDefault on the focused tab stops an arrow key", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: string) => void>();
			render(
				<Tabs.Root defaultValue="a" onValueChange={onValueChange}>
					<Tabs.List>
						<Tabs.Trigger value="a" onKeyDown={(event) => event.preventDefault()}>
							Tab A
						</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();
			await user.keyboard("{ArrowRight}");

			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
			expect(onValueChange).not.toHaveBeenCalled();
		});

		test("an arrow key selects the next tab before focus reaches it", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: string) => void>();
			let selectedOnFocus: string | null = null;
			render(
				<Tabs.Root defaultValue="a" onValueChange={onValueChange}>
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger
							value="b"
							onFocus={(event) => {
								selectedOnFocus = event.currentTarget.getAttribute("aria-selected");
							}}
						>
							Tab B
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();
			await user.keyboard("{ArrowRight}");

			// Why: NVDA reads a tab on focus and again when its selection changes.
			expect(selectedOnFocus).toBe("true");
			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenLastCalledWith("b");
		});

		test("arrow keys move focus and raise no error with no scrollIntoView or matchMedia, as in jsdom", async () => {
			const saved = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
			Object.defineProperty(Element.prototype, "scrollIntoView", {
				configurable: true,
				value: undefined,
			});
			vi.stubGlobal("matchMedia", undefined);
			const errors: unknown[] = [];
			const onError = (event: ErrorEvent) => errors.push(event.error);
			window.addEventListener("error", onError);
			try {
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
				await user.keyboard("{ArrowRight}");

				expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
				expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
				expect(errors).toEqual([]);
			} finally {
				window.removeEventListener("error", onError);
				if (saved == null) {
					Reflect.deleteProperty(Element.prototype, "scrollIntoView");
				} else {
					Object.defineProperty(Element.prototype, "scrollIntoView", saved);
				}
			}
		});

		test("keyboard focus in a vertical tablist does not scroll the trigger into view", async () => {
			const user = userEvent.setup();
			// Why a spy: happy-dom lays out nothing, so the `scrollIntoView` call is the
			// only observable of the scroll.
			const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
			render(
				<Tabs.Root orientation="vertical" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			await user.tab();

			// A vertical tablist is not a scroll container, so the listener is never
			// registered and focusing a trigger must not scroll the page.
			expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
			expect(scrollIntoView).not.toHaveBeenCalled();
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
				// The part renders mantle's `Separator`, which joins its own slot last.
				slot: "tabs-separator separator",
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

				const separator = container.querySelector('[data-slot~="tabs-separator"]');
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
			expect(container.querySelector('[data-slot~="tabs-separator"]')).toHaveAttribute(
				"role",
				"none",
			);

			rerender(
				<Tabs.Root defaultValue="a">
					<Tabs.Separator semantic />
				</Tabs.Root>,
			);
			expect(screen.getByRole("separator")).toHaveAttribute(
				"data-slot",
				"tabs-separator separator",
			);
		});

		test("merges the consumer's className and ref onto the separator element", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			const { container } = render(
				<Tabs.Root defaultValue="a">
					<Tabs.Separator className="my-2" ref={refSpy} />
				</Tabs.Root>,
			);

			const separator = container.querySelector('[data-slot~="tabs-separator"]');
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
			// The part's slot joins ahead of the `Separator` it renders.
			expect(rule).toHaveAttribute("data-slot", "tabs-separator separator");
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
		// Regression: a cloned `tabIndex: 0` won over the roving `tabIndex`, so
		// every asChild tab was a Tab stop instead of only the active one.
		test("asChild keeps the roving tabIndex so only the active tab is a Tab stop", async () => {
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
			// Why tagName: the asChild swap renders the child element in place of the default.
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
			expect(link).toHaveAttribute("href", "/a");
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
			// Why a button: `<a>` ignores `disabled`, so the part swaps the child for
			// a real `<button>` to keep a disabled routing tab non-navigable.
			expect(tabB.tagName).toBe("BUTTON");
			expect(tabB).toBeDisabled();
			expect(tabB).not.toHaveAttribute("href");
			expect(tabB).toHaveAttribute("aria-disabled", "true");
			await user.click(tabB);
			expect(onClick).not.toHaveBeenCalled();
			expect(tabB).toHaveAttribute("aria-selected", "false");
		});

		// `disabled` derives from `parseBooleanish(ariaDisabled ?? disabled)`, so an
		// explicit `aria-disabled` wins, and `aria-disabled={false}` keeps the tab
		// enabled beside `disabled`.
		test.each([
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
				name: "aria-disabled={false} beside disabled",
				props: { "aria-disabled": false, disabled: true },
				disabled: false,
				ariaDisabled: "false",
			},
			{ name: "neither", props: {}, disabled: false, ariaDisabled: null },
		] as const satisfies ReadonlyArray<{
			name: string;
			props: Pick<ComponentProps<typeof Tabs.Trigger>, "aria-disabled" | "disabled">;
			disabled: boolean;
			ariaDisabled: string | null;
		}>)("coerces the disabled state from $name", ({ props, disabled, ariaDisabled }) => {
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
			// `null` means the attribute is absent: the trigger only forwards
			// `aria-disabled` when the consumer supplied one of the two props.
			expect(trigger.getAttribute("aria-disabled")).toBe(ariaDisabled);
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

			expect(findTranslatedFont(trigger)).toBeNull();
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

			expect(findTranslatedFont(trigger)).toBeNull();
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
			// have to reach the DOM, and the consumer's now matches nothing. That is
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
			// tailwind-merge drops the default instead of shipping both. That is
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

	describe("Content", () => {
		test("the server HTML renders an inactive panel hidden until found with its text, and a plain one empty", () => {
			const html = renderToString(
				<Tabs.Root defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">A</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="a" hiddenUntilFound>
						Panel A
					</Tabs.Content>
					<Tabs.Content value="b" hiddenUntilFound>
						Panel B
					</Tabs.Content>
					<Tabs.Content value="c">Panel C</Tabs.Content>
				</Tabs.Root>,
			);
			// Why lower case: React writes the attribute name as given, and the HTML parser lowercases it.
			const panels = [...html.matchAll(/<div role="tabpanel"[^>]*>/g)].map(([tag]) =>
				tag.toLowerCase(),
			);

			expect(panels).toHaveLength(3);
			expect(panels[0]).not.toContain(" hidden=");
			expect(panels[1]).toContain('hidden="until-found"');
			// A plain inactive panel stays an empty `hidden` element, so its tab's `aria-controls` resolves.
			expect(panels[2]).toContain('hidden=""');
			expect(html).toContain("Panel B");
			expect(html).not.toContain("Panel C");
		});

		// Why a consumer tabIndex: the panel forwards it, so the reveal cannot read
		// the selected state from the panel's own `tabIndex`.
		test.each([-1, 0])(
			"a revealed panel with tabIndex={%i} selects its tab and stays shown",
			async (tabIndex) => {
				render(
					<Tabs.Root defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">A</Tabs.Trigger>
							<Tabs.Trigger value="b">B</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="a">Panel A</Tabs.Content>
						<Tabs.Content value="b" hiddenUntilFound tabIndex={tabIndex}>
							Panel B
						</Tabs.Content>
					</Tabs.Root>,
				);
				const panel = screen.getByText("Panel B");
				expect(panel).toHaveAttribute("hidden", "until-found");

				// The browser removes `hidden` when find-in-page reaches the panel.
				act(() => {
					panel.removeAttribute("hidden");
				});

				await waitFor(() => {
					expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
				});
				expect(panel).not.toHaveAttribute("hidden");
			},
		);
	});
});

describe("HeadlessTabs", () => {
	// Why a custom id: the reveal must not find the trigger by its generated id.
	test("a revealed panel whose trigger has its own id selects the tab and stays shown", async () => {
		render(
			<HeadlessTabs.Root defaultValue="a">
				<HeadlessTabs.List>
					<HeadlessTabs.Trigger value="a">A</HeadlessTabs.Trigger>
					<HeadlessTabs.Trigger value="b" id="custom-b">
						B
					</HeadlessTabs.Trigger>
				</HeadlessTabs.List>
				<HeadlessTabs.Content value="a">Panel A</HeadlessTabs.Content>
				<HeadlessTabs.Content value="b" hiddenUntilFound>
					Panel B
				</HeadlessTabs.Content>
			</HeadlessTabs.Root>,
		);
		const panel = screen.getByText("Panel B");

		act(() => {
			panel.removeAttribute("hidden");
		});

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
		});
		expect(panel).not.toHaveAttribute("hidden");
	});

	test("keeps the tabs keyboard and ARIA contract without the Tabs look", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<HeadlessTabs.Root defaultValue="api" onValueChange={onValueChange}>
				<HeadlessTabs.List aria-label="Use cases">
					<HeadlessTabs.Trigger value="api">API gateway</HeadlessTabs.Trigger>
					<HeadlessTabs.Trigger value="webhooks">Webhooks</HeadlessTabs.Trigger>
				</HeadlessTabs.List>
				<HeadlessTabs.Content value="api">One front door</HeadlessTabs.Content>
				<HeadlessTabs.Content value="webhooks">Verify every webhook</HeadlessTabs.Content>
			</HeadlessTabs.Root>,
		);
		const api = screen.getByRole("tab", { name: "API gateway" });
		const webhooks = screen.getByRole("tab", { name: "Webhooks" });
		expect(screen.getByRole("tablist", { name: "Use cases" })).toBeInTheDocument();
		expect(webhooks).toHaveAttribute("tabindex", "-1");

		await user.click(api);
		await user.keyboard("{ArrowRight}");

		expect(webhooks).toHaveFocus();
		expect(webhooks).toHaveAttribute("aria-selected", "true");
		expect(onValueChange).toHaveBeenCalledExactlyOnceWith("webhooks");
		const panel = screen.getByRole("tabpanel", { name: "Webhooks" });
		expect(panel).toHaveTextContent("Verify every webhook");
		expect(webhooks).toHaveAttribute("aria-controls", panel.id);
	});

	// Why: a page can keep the styled list and draw only its own triggers.
	test("a headless trigger switches the panel inside a styled Tabs.Root", async () => {
		const user = userEvent.setup();
		render(
			<Tabs.Root appearance="pill" defaultValue="install">
				<Tabs.List>
					<HeadlessTabs.Trigger value="install">Homebrew</HeadlessTabs.Trigger>
					<HeadlessTabs.Trigger value="download">Download</HeadlessTabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="install">brew install ngrok</Tabs.Content>
				<Tabs.Content value="download">Download the zip</Tabs.Content>
			</Tabs.Root>,
		);

		await user.click(screen.getByRole("tab", { name: "Download" }));

		expect(screen.getByRole("tabpanel", { name: "Download" })).toHaveTextContent(
			"Download the zip",
		);
	});

	test("a part outside a root throws with the root it needs", () => {
		// Why: silence React's error log for the expected throw.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<HeadlessTabs.List />)).toThrow(
			"HeadlessTabs.List must be rendered inside HeadlessTabs.Root or Tabs.Root.",
		);
	});
});

// Type-level contract: a handler typed with a union of tab values type-checks.
void (<Tabs.Root onValueChange={(_value: "account" | "password") => {}} />);
// Type-level contract: typecheck fails when a directive below goes unused.
// @ts-expect-error -- children need asChild
void (<Tabs.Separator>rule</Tabs.Separator>);
// @ts-expect-error -- asChild needs a child to clone
void (<Tabs.Separator asChild />);

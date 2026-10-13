import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Tooltip, TooltipProvider } from "../tooltip/index.js";
import { TruncatedText, type TruncatedTextProps } from "./truncated-text.js";

const url = "https://example.ngrok.app/api/items?filter=abc&limit=200";

/**
 * The widths, in CSS pixels, the stubbed layout reports for the root's content
 * box and for the text of each segment. happy-dom lays nothing out, so every
 * width is zero until a test stubs these.
 */
type Geometry = { root: number; head: number; tail: number };

/** Reports `geometry` from the two rect reads the component's measurement makes. */
function stubGeometry(geometry: Geometry) {
	const widthOf = (node: Node | null): number => {
		if (!(node instanceof HTMLElement)) {
			return 0;
		}
		const slot = node.getAttribute("data-slot") ?? "";
		if (slot.includes("truncated-text-head")) {
			return geometry.head;
		}
		if (slot.includes("truncated-text-tail")) {
			return geometry.tail;
		}
		if (slot.includes("truncated-text")) {
			return geometry.root;
		}
		return 0;
	};
	vi.spyOn(Range.prototype, "getBoundingClientRect").mockImplementation(function (this: Range) {
		return new DOMRect(0, 0, widthOf(this.startContainer), 16);
	});
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
		this: HTMLElement,
	) {
		return new DOMRect(0, 0, widthOf(this), 16);
	});
}

/** The callbacks the component registers, so a test can fire a resize by hand. */
const resizeCallbacks = new Set<ResizeObserverCallback>();

class FakeResizeObserver implements ResizeObserver {
	#callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.#callback = callback;
	}

	observe(): void {
		resizeCallbacks.add(this.#callback);
	}

	unobserve(): void {}

	disconnect(): void {
		resizeCallbacks.delete(this.#callback);
	}
}

/** Fires every registered observer, the way a layout change would. */
function resize(): void {
	act(() => {
		for (const callback of resizeCallbacks) {
			callback([], new FakeResizeObserver(callback));
		}
	});
}

const fits: Geometry = { root: 400, head: 250, tail: 60 };
const overflows: Geometry = { root: 200, head: 250, tail: 60 };

/** The props a test varies. `asChild` cases render their own tree, because the child is the point. */
type RenderProps = Partial<Omit<TruncatedTextProps, "asChild" | "children">>;

function renderValue(props: RenderProps = {}) {
	return render(
		<TooltipProvider>
			<TruncatedText data-testid="value" value={url} {...props} />
		</TooltipProvider>,
	);
}

beforeEach(() => {
	resizeCallbacks.clear();
	vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

describe("TruncatedText", () => {
	test("renders the value as a head and a tail of eight graphemes", () => {
		renderValue();
		const root = screen.getByTestId("value");
		// Why `tagName`: the JSDoc promises a `<span>` root, so the element is the contract.
		expect(root.tagName).toBe("SPAN");
		expect(root).toHaveAttribute("data-slot", "truncated-text");
		expect(root).toHaveAttribute("dir", "ltr");
		expect(root.querySelector('[data-slot="truncated-text-head"]')).toHaveTextContent(
			"https://example.ngrok.app/api/items?filter=abc&l",
		);
		expect(root.querySelector('[data-slot="truncated-text-tail"]')).toHaveTextContent("imit=200");
	});

	test("exposes the whole value once to assistive technology and hides the segments", () => {
		renderValue();
		const root = screen.getByTestId("value");
		expect(root.querySelector('[data-slot="truncated-text-value"]')).toHaveTextContent(url);
		expect(root.querySelector('[data-slot="truncated-text-head"]')).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(root.querySelector('[data-slot="truncated-text-tail"]')).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

	test("`tail` picks how many graphemes stay visible", () => {
		renderValue({ tail: 3 });
		const root = screen.getByTestId("value");
		expect(root.querySelector('[data-slot="truncated-text-head"]')).toHaveTextContent(
			"https://example.ngrok.app/api/items?filter=abc&limit=",
		);
		expect(root.querySelector('[data-slot="truncated-text-tail"]')).toHaveTextContent("200");
	});

	test("forwards the ref and lets the consumer's className win", () => {
		const ref = createRef<HTMLSpanElement>();
		renderValue({ className: "select-text", ref });
		const root = screen.getByTestId("value");
		expect(ref.current).toBe(root);
		// A tailwind-merge override contract: `select-text` is the documented way
		// out of the default `select-all`, so it has to replace it, not sit beside it.
		expect(root.className).toContain("select-text");
		expect(root.className).not.toContain("select-all");
	});

	test('renders translate="no" so a translation engine skips the value', () => {
		renderValue();
		expect(screen.getByTestId("value")).toHaveAttribute("translate", "no");
	});

	test("asChild renders its child, merging classes, data-slot, and the ref onto it", () => {
		const ref = createRef<HTMLElement>();
		render(
			<TooltipProvider>
				<TruncatedText asChild className="custom-class" data-testid="value" value={url}>
					<code ref={ref} />
				</TruncatedText>
			</TooltipProvider>,
		);
		const root = screen.getByTestId("value");
		expect(root.tagName).toBe("CODE");
		expect(root).toHaveAttribute("data-slot", "truncated-text");
		expect(root).toHaveClass("custom-class");
		expect(ref.current).toBe(root);
		expect(root.querySelector('[data-slot="truncated-text-tail"]')).toHaveTextContent("imit=200");
	});

	test("asChild throws when the child has children of its own", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<TooltipProvider>
					<TruncatedText asChild value={url}>
						<code>{url}</code>
					</TruncatedText>
				</TooltipProvider>,
			),
		).toThrow(/must have no children of its own/);
	});

	test("server-renders the value in both segments and assumes no overflow", () => {
		const html = renderToString(
			<TooltipProvider>
				<TruncatedText value={url} />
			</TooltipProvider>,
		);
		expect(html).toContain("filter=abc&amp;l</span>");
		expect(html).toContain(">imit=200</span>");
		expect(html).not.toContain('data-truncated=""');
		// Why the variable: the server lays nothing out, so this `ch` reserve is
		// what keeps the tail visible in a monospace font before hydration.
		expect(html).toContain("--_tail-width:8ch");
	});

	describe("while the value overflows", () => {
		test("stamps data-truncated and opens a tooltip with the full value on hover", async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue();
			const root = screen.getByTestId("value");
			expect(root).toHaveAttribute("data-truncated", "");

			await user.hover(root);

			const tooltip = await screen.findByRole("tooltip");
			expect(tooltip).toHaveTextContent(url);
			expect(tooltip).toHaveAttribute("translate", "no");
			expect(root).toHaveAttribute("data-state", expect.stringMatching(/open$/));
			// The tooltip's text is the root's own content, so a description would
			// make a screen reader read the value twice.
			expect(root).not.toHaveAttribute("aria-describedby");
		});

		test("keeps a consumer's aria-describedby while the tooltip is open", async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue({ "aria-describedby": "hint" });
			const root = screen.getByTestId("value");

			await user.hover(root);

			await screen.findByRole("tooltip");
			// Why exact: the tooltip id must not join the consumer's own id.
			expect(root).toHaveAttribute("aria-describedby", "hint");
		});

		test("becomes a tab stop and opens the tooltip on focus", async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue();
			const root = screen.getByTestId("value");
			expect(root).toHaveAttribute("tabindex", "0");

			await user.tab();

			expect(root).toHaveFocus();
			expect(await screen.findByRole("tooltip")).toHaveTextContent(url);
		});

		test("lets a consumer's tabIndex win", () => {
			stubGeometry(overflows);
			renderValue({ tabIndex: -1 });
			expect(screen.getByTestId("value")).toHaveAttribute("tabindex", "-1");
		});

		test("treats an overflow past half a pixel as truncated", () => {
			// 250 + 60 = 310 against 309.4 + 0.5: the boundary pins the epsilon.
			stubGeometry({ root: 309.4, head: 250, tail: 60 });
			renderValue();
			expect(screen.getByTestId("value")).toHaveAttribute("data-truncated", "");
		});

		test("measures again when the value changes", () => {
			stubGeometry(overflows);
			const { rerender } = renderValue();
			const root = screen.getByTestId("value");
			expect(root).toHaveAttribute("data-truncated", "");

			stubGeometry(fits);
			rerender(
				<TooltipProvider>
					<TruncatedText data-testid="value" value="ep_2abcd" />
				</TooltipProvider>,
			);

			expect(root).not.toHaveAttribute("data-truncated");
		});

		test("measures the new element when an asChild child changes type", () => {
			stubGeometry(overflows);
			const { rerender } = render(
				<TooltipProvider>
					<TruncatedText asChild data-testid="value" value={url}>
						<code />
					</TruncatedText>
				</TooltipProvider>,
			);
			expect(screen.getByTestId("value")).toHaveAttribute("data-truncated", "");

			stubGeometry(fits);
			rerender(
				<TooltipProvider>
					<TruncatedText asChild data-testid="value" value={url}>
						<kbd />
					</TruncatedText>
				</TooltipProvider>,
			);

			const root = screen.getByTestId("value");
			expect(root.tagName).toBe("KBD");
			expect(root).not.toHaveAttribute("data-truncated");
		});

		test("stays closed when the value overflows again after it fit while the tooltip was open", async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue();
			const root = screen.getByTestId("value");
			await user.hover(root);
			expect(await screen.findByRole("tooltip")).toHaveTextContent(url);

			stubGeometry(fits);
			resize();
			await waitFor(() => {
				expect(screen.queryByRole("tooltip")).toBeNull();
			});

			stubGeometry(overflows);
			resize();

			expect(root).toHaveAttribute("data-truncated", "");
			expect(screen.queryByRole("tooltip")).toBeNull();
		});

		test('passes translate="yes" to the root and the tooltip', async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue({ translate: "yes" });
			const root = screen.getByTestId("value");
			expect(root).toHaveAttribute("translate", "yes");

			await user.hover(root);

			expect(await screen.findByRole("tooltip")).toHaveAttribute("translate", "yes");
		});

		test("drops data-truncated and closes the tooltip once the container grows", async () => {
			const user = userEvent.setup();
			stubGeometry(overflows);
			renderValue();
			const root = screen.getByTestId("value");
			await user.hover(root);
			expect(await screen.findByRole("tooltip")).toHaveTextContent(url);

			stubGeometry(fits);
			resize();

			expect(root).not.toHaveAttribute("data-truncated");
			await waitFor(() => {
				expect(screen.queryByRole("tooltip")).toBeNull();
			});
		});
	});

	describe("while the value fits", () => {
		test("leaves data-truncated off and adds no tab stop", () => {
			stubGeometry(fits);
			renderValue();
			const root = screen.getByTestId("value");
			expect(root).not.toHaveAttribute("data-truncated");
			expect(root).not.toHaveAttribute("tabindex");
		});

		test("leaves another open tooltip alone on hover", async () => {
			const user = userEvent.setup();
			stubGeometry(fits);
			render(
				<TooltipProvider>
					<Tooltip.Root>
						<Tooltip.Trigger>Copy</Tooltip.Trigger>
						<Tooltip.Content>Copy endpoint URL</Tooltip.Content>
					</Tooltip.Root>
					<TruncatedText data-testid="value" value={url} />
				</TooltipProvider>,
			);
			// Focus opens the button's tooltip, so no pointer leave can close it.
			await user.tab();
			expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy endpoint URL");

			await user.hover(screen.getByTestId("value"));

			// Radix closes every other tooltip when a trigger opens, so this one
			// survives only when the fitting value never asks to open.
			expect(screen.getByRole("tooltip")).toHaveTextContent("Copy endpoint URL");
		});

		test("treats an overflow inside half a pixel as fitting", () => {
			// 250 + 60 = 310 against 309.7 + 0.5: the engines round the root's
			// shrink-to-fit width and the text widths at different steps.
			stubGeometry({ root: 309.7, head: 250, tail: 60 });
			renderValue();
			expect(screen.getByTestId("value")).not.toHaveAttribute("data-truncated");
		});

		test("stamps data-truncated once the container shrinks", () => {
			stubGeometry(fits);
			renderValue();
			const root = screen.getByTestId("value");

			stubGeometry(overflows);
			resize();

			expect(root).toHaveAttribute("data-truncated", "");
		});
	});

	test("keeps rendering when a translatable value changes on a translated page", () => {
		// Why `translate="yes"`: the engine skips a `translate="no"` subtree, so
		// only the prose mode exposes the two text nodes to the rewrite.
		const { rerender } = renderValue({ translate: "yes" });
		const root = screen.getByTestId("value");
		translateTextNodes(root);
		expect(root).toHaveTextContent(
			"[https://example.ngrok.app/api/items?filter=abc&l-es][imit=200-es]",
		);

		rerender(
			<TooltipProvider>
				<TruncatedText data-testid="value" translate="yes" value="ep_2abcd" />
			</TooltipProvider>,
		);

		expect(root.querySelector("font")).toBeNull();
		expect(root.querySelector('[data-slot="truncated-text-value"]')).toHaveTextContent("ep_2abcd");
		expect(root.querySelector('[data-slot="truncated-text-head"]')).toHaveTextContent("");
		expect(root.querySelector('[data-slot="truncated-text-tail"]')).toHaveTextContent("ep_2abcd");
	});
});

import { render } from "@testing-library/react";
import { type CSSProperties, createRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Slot } from "./slot.js";

describe("Slot", () => {
	it("renders the child element unchanged when no Slot props are provided", () => {
		const { container } = render(
			<Slot>
				<button className="child-class" type="button">
					Click me
				</button>
			</Slot>,
		);

		const button = container.querySelector("button");

		if (button == null) {
			throw new Error("Expected a <button> to be rendered");
		}

		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("child-class");
		expect(button).toHaveAttribute("type", "button");
	});

	it("forwards non-className props from Slot onto the child element", () => {
		const { getByRole } = render(
			<Slot data-testid="custom-slot" aria-label="Home link">
				<a href="/">Home</a>
			</Slot>,
		);

		const link = getByRole("link");

		expect(link).toHaveAttribute("data-testid", "custom-slot");
		expect(link).toHaveAttribute("aria-label", "Home link");
		expect(link).toHaveAttribute("href", "/");
	});

	it("merges className from Slot and child, giving the child precedence on conflicting Tailwind classes", () => {
		const { container } = render(
			<Slot className="text-red-500 px-4">
				<div className="text-blue-500 px-2 py-2">Content</div>
			</Slot>,
		);

		const div = container.querySelector("div");

		if (div == null) {
			throw new Error("Expected a <div> to be rendered");
		}

		// Child's text color should win over parent's
		expect(div).toHaveClass("text-blue-500");
		expect(div).not.toHaveClass("text-red-500");

		// Child's px should win over parent's (Tailwind merge behavior)
		expect(div).toHaveClass("px-2");
		expect(div).not.toHaveClass("px-4");

		// Non-conflicting classes from both sides should be preserved
		expect(div).toHaveClass("py-2");
	});

	it("preserves child-only className when Slot has no className", () => {
		const { container } = render(
			<Slot>
				<span className="child-only-class">Text</span>
			</Slot>,
		);

		const span = container.querySelector("span");

		if (span == null) {
			throw new Error("Expected a <span> to be rendered");
		}

		expect(span).toHaveClass("child-only-class");
	});

	it("applies Slot className when the child has no className", () => {
		const { container } = render(
			<Slot className="slot-only-class">
				<p>Paragraph</p>
			</Slot>,
		);

		const p = container.querySelector("p");

		if (p == null) {
			throw new Error("Expected a <p> to be rendered");
		}

		expect(p).toHaveClass("slot-only-class");
	});

	it("merges base + Slot className + child className in the intended precedence", () => {
		/**
		 * This simulates a real component using Slot:
		 * - `baseClassName` = internal component styles
		 * - `componentClassName` = user `className` on the component
		 * - child `className` = most specific, on the asChild child
		 */
		const baseClassName = "text-gray-500 underline";
		const componentClassName = "text-red-500 font-medium";
		const parentMerged = `${baseClassName} ${componentClassName}`;

		const { container } = render(
			<Slot className={parentMerged}>
				<a href="/" className="text-blue-500 no-underline">
					Home
				</a>
			</Slot>,
		);

		const link = container.querySelector("a");

		if (link == null) {
			throw new Error("Expected an <a> to be rendered");
		}

		// Child wins on text color + underline
		expect(link).toHaveClass("text-blue-500");
		expect(link).toHaveClass("no-underline");
		expect(link).not.toHaveClass("text-red-500");
		expect(link).not.toHaveClass("text-gray-500");
		expect(link).not.toHaveClass("underline");

		// Non-conflicting things like font weight from the component can still survive
		expect(link).toHaveClass("font-medium");
	});

	it("forwards refs to the underlying DOM element", () => {
		const ref = createRef<HTMLButtonElement>();

		const { container } = render(
			<Slot ref={ref}>
				<button type="button">Click me</button>
			</Slot>,
		);

		const button = container.querySelector("button");

		if (button == null) {
			throw new Error("Expected a <button> to be rendered");
		}

		expect(ref.current).toBe(button);
	});

	it("supports functional refs as well as object refs", () => {
		let node: HTMLAnchorElement | null = null;

		const ref = (el: HTMLAnchorElement | null) => {
			node = el;
		};

		const { getByRole } = render(
			<Slot ref={ref}>
				<a href="/">Home</a>
			</Slot>,
		);

		const link = getByRole("link");

		expect(node).toBe(link);
	});

	it("does not blow up when the child has no existing props", () => {
		const { container } = render(
			<Slot className="slot-class">
				{/* bare element, no props */}
				<div>Content</div>
			</Slot>,
		);

		const div = container.querySelector("div");

		if (div == null) {
			throw new Error("Expected a <div> to be rendered");
		}

		expect(div).toHaveClass("slot-class");
	});

	it("concatenates data-slot values in DOM order — the Slot's chain first, then the child's own", () => {
		const { container } = render(
			<Slot data-slot="parent-part">
				<div data-slot="child-part">Content</div>
			</Slot>,
		);

		const div = container.querySelector("div");
		expect(div).toHaveAttribute("data-slot", "parent-part child-part");
	});

	it("keeps a single data-slot as-is and renders no attribute when neither side has one", () => {
		const { container: withSlot } = render(
			<Slot data-slot="parent-part">
				<div>Content</div>
			</Slot>,
		);
		expect(withSlot.querySelector("div")).toHaveAttribute("data-slot", "parent-part");

		const { container: withoutSlot } = render(
			<Slot>
				<div>Content</div>
			</Slot>,
		);
		expect(withoutSlot.querySelector("div")).not.toHaveAttribute("data-slot");
	});

	it("handles event handlers passed via Slot and child (both are called)", () => {
		const slotOnClick = vi.fn<() => void>();
		const childOnClick = vi.fn<() => void>();

		const { getByRole } = render(
			<Slot onClick={slotOnClick}>
				<button type="button" onClick={childOnClick}>
					Click me
				</button>
			</Slot>,
		);

		const button = getByRole("button");

		button.click();

		// Radix Slot semantics: both handlers should run
		expect(slotOnClick).toHaveBeenCalledTimes(1);
		expect(childOnClick).toHaveBeenCalledTimes(1);
	});
});

/**
 * Stands in for react-router's `NavLink`: `className` and `style` may each be a
 * function of the link's active state, which the component resolves itself. This
 * is the shape that silently loses its styling through `asChild` (issue #1374).
 */
type NavLinkishState = { isActive: boolean };

type NavLinkishProps = {
	className?: string | ((state: NavLinkishState) => string);
	style?: CSSProperties | ((state: NavLinkishState) => CSSProperties);
	children?: ReactNode | ((state: NavLinkishState) => ReactNode);
};

function NavLinkish({ children, className, style }: NavLinkishProps) {
	const state: NavLinkishState = { isActive: true };
	return (
		<a
			href="/endpoints"
			className={typeof className === "function" ? className(state) : className}
			style={typeof style === "function" ? style(state) : style}
		>
			{typeof children === "function" ? children(state) : children}
		</a>
	);
}

describe("Slot render-prop diagnostics", () => {
	// The dedupe registry is module state keyed by element name + prop, so each
	// test below must exercise a distinct key (or assert no warning at all).
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("drops a function className and warns once, naming the element and the prop", () => {
		const { getByRole, rerender } = render(
			<Slot>
				<NavLinkish className={({ isActive }) => (isActive ? "is-active" : "")}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		// The actual failure this warning exists for: the render prop never ran,
		// so the active class is simply absent — no error, no styling.
		expect(getByRole("link")).not.toHaveClass("is-active");

		expect(console.warn).toHaveBeenCalledTimes(1);
		const [message] = vi.mocked(console.warn).mock.calls[0] ?? [];
		expect(message).toContain("asChild dropped the `className` render prop on <NavLinkish>");

		// Warns once per element+prop, not once per render.
		rerender(
			<Slot>
				<NavLinkish className={({ isActive }) => (isActive ? "is-active" : "")}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	it("drops a function style and warns about it separately", () => {
		const { getByRole } = render(
			<Slot>
				<NavLinkish style={({ isActive }) => ({ color: isActive ? "red" : "blue" })}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		// Radix's own mergeProps spreads `style` into an object literal, so a
		// function becomes `{}` and the element renders with no inline style at all.
		expect(getByRole("link").getAttribute("style")).toBeFalsy();

		expect(console.warn).toHaveBeenCalledTimes(1);
		const [message] = vi.mocked(console.warn).mock.calls[0] ?? [];
		expect(message).toContain("asChild dropped the `style` render prop on <NavLinkish>");
	});

	it("stays silent for plain string className and object style", () => {
		const { getByRole } = render(
			<Slot className="from-slot">
				<NavLinkish className="is-active" style={{ color: "red" }}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("from-slot");
		expect(link).toHaveClass("is-active");
		expect(link).toHaveStyle({ color: "red" });
		expect(console.warn).not.toHaveBeenCalled();
	});

	it("stays silent for a function children, which survives composition", () => {
		// Regression guard on the warning's scope: only className and style are
		// lost. A render-prop `children` survives cloneElement intact — asserted by
		// the resolved text actually rendering, not just by the absence of a warning.
		const { getByRole } = render(
			<Slot>
				<NavLinkish>
					{({ isActive }) => (isActive ? "Endpoints (current)" : "Endpoints")}
				</NavLinkish>
			</Slot>,
		);
		expect(getByRole("link")).toHaveTextContent("Endpoints (current)");
		expect(console.warn).not.toHaveBeenCalled();
	});
});

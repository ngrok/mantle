import { createSlot } from "@radix-ui/react-slot";
import { render } from "@testing-library/react";
import { type ComponentProps, type CSSProperties, createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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
 * function of the link's active state, which the component — not the `Slot` —
 * resolves. This is the shape that used to silently lose its styling through
 * `asChild` (issue #1374).
 */
type NavLinkishState = { isActive: boolean };

// Shaped like `NavLinkProps`: the three render-prop-capable props replace their
// anchor counterparts, and everything else is forwarded to the anchor as-is.
type NavLinkishProps = Omit<ComponentProps<"a">, "children" | "className" | "style"> & {
	className?: string | ((state: NavLinkishState) => string | undefined);
	isActive?: boolean;
	style?: CSSProperties | ((state: NavLinkishState) => CSSProperties);
	children?: ReactNode | ((state: NavLinkishState) => ReactNode);
};

function NavLinkish({ children, className, isActive = true, style, ...props }: NavLinkishProps) {
	const state: NavLinkishState = { isActive };
	return (
		<a
			href="/endpoints"
			{...props}
			className={typeof className === "function" ? className(state) : className}
			style={typeof style === "function" ? style(state) : style}
		>
			{typeof children === "function" ? children(state) : children}
		</a>
	);
}

describe("Slot render-prop className and style", () => {
	it("composes a function className, resolved by the child with its own state", () => {
		const { getByRole } = render(
			<Slot className="slot-class">
				<NavLinkish className={({ isActive }) => (isActive ? "is-active" : undefined)}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("is-active");
		expect(link).toHaveClass("slot-class");
	});

	it("forwards the arguments the child supplies, untouched", () => {
		const received: NavLinkishState[] = [];

		render(
			<Slot className="slot-class">
				<NavLinkish
					className={(state) => {
						received.push(state);
						return "is-active";
					}}
					isActive={false}
				/>
			</Slot>,
		);

		// Slot invents no arguments of its own: whatever the child passed is what
		// the author's function sees.
		expect(received).toEqual([{ isActive: false }]);
	});

	it("re-resolves on every render, so the child's state can change", () => {
		// The composed value has to stay a function all the way to the child. If it
		// were resolved once at composition time, the class would be frozen at the
		// state of the first render — which is the whole point of a render prop.
		const { getByRole, rerender } = render(
			<Slot className="slot-class">
				<NavLinkish
					className={({ isActive }) => (isActive ? "is-active" : "is-inactive")}
					isActive={false}
				>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		expect(getByRole("link")).toHaveClass("is-inactive");

		rerender(
			<Slot className="slot-class">
				<NavLinkish className={({ isActive }) => (isActive ? "is-active" : "is-inactive")} isActive>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		expect(getByRole("link")).toHaveClass("is-active");
		expect(getByRole("link")).not.toHaveClass("is-inactive");
		expect(getByRole("link")).toHaveClass("slot-class");
	});

	it("keeps child-wins precedence for a function className, merging conflicting Tailwind classes", () => {
		const { getByRole } = render(
			<Slot className="text-red-500 px-4">
				<NavLinkish className={() => "text-blue-500 py-2"}>Endpoints</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("text-blue-500");
		expect(link).not.toHaveClass("text-red-500");
		expect(link).toHaveClass("px-4");
		expect(link).toHaveClass("py-2");
	});

	it("composes a function style with the Slot's style, letting the child win per property", () => {
		const { getByRole } = render(
			<Slot style={{ color: "blue", fontWeight: 500 }}>
				<NavLinkish style={({ isActive }) => ({ color: isActive ? "red" : "blue" })}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		expect(getByRole("link")).toHaveStyle({ color: "red", fontWeight: "500" });
	});

	it("composes a function className and a function style at the same time", () => {
		const { getByRole } = render(
			<Slot className="slot-class" style={{ fontWeight: 500 }}>
				<NavLinkish className={() => "is-active"} style={() => ({ color: "red" })}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("slot-class");
		expect(link).toHaveClass("is-active");
		expect(link).toHaveStyle({ color: "red", fontWeight: "500" });
	});

	it("survives a nested asChild chain, accumulating every ancestor's classes", () => {
		// What a real composition looks like: an outer mantle part composing an
		// inner one (`Sidebar.ItemButton asChild > Tooltip.Trigger asChild > NavLink`).
		const { getByRole } = render(
			<Slot className="outer-class" data-slot="outer">
				<Slot className="inner-class" data-slot="inner">
					<NavLinkish className={({ isActive }) => (isActive ? "is-active" : undefined)}>
						Endpoints
					</NavLinkish>
				</Slot>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("outer-class");
		expect(link).toHaveClass("inner-class");
		expect(link).toHaveClass("is-active");
		expect(link).toHaveAttribute("data-slot", "outer inner");
	});

	it("renders no style attribute when neither the Slot nor the child has one", () => {
		const { getByRole } = render(
			<Slot className="slot-class">
				<NavLinkish className={() => "is-active"}>Endpoints</NavLinkish>
			</Slot>,
		);

		expect(getByRole("link")).not.toHaveAttribute("style");
	});

	it("hands a component child no style prop at all when neither side has one, and its own object when only the Slot does", () => {
		// A component child forwards what it is given, so an empty object would
		// travel further down the tree and change a new identity every render.
		const received: Array<CSSProperties | undefined> = [];
		const slotStyle: CSSProperties = { fontWeight: 500 };

		function StyleProbe({ style }: { style?: CSSProperties }) {
			received.push(style);
			return <a href="/endpoints">Endpoints</a>;
		}

		const { rerender } = render(
			<Slot className="slot-class">
				<StyleProbe />
			</Slot>,
		);
		rerender(
			<Slot className="slot-class" style={slotStyle}>
				<StyleProbe />
			</Slot>,
		);

		expect(received[0]).toBeUndefined();
		// Passed through by identity, not copied into a fresh object per render.
		expect(received[1]).toBe(slotStyle);
	});

	it("still merges plain string className and object style", () => {
		const { getByRole } = render(
			<Slot className="slot-class" style={{ fontWeight: 500 }}>
				<NavLinkish className="is-active" style={{ color: "red" }}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("slot-class");
		expect(link).toHaveClass("is-active");
		expect(link).toHaveStyle({ color: "red", fontWeight: "500" });
	});

	it("leaves a function children alone", () => {
		// `children` is forwarded as-is — Slot composes className and style only.
		const { getByRole } = render(
			<Slot>
				<NavLinkish>
					{({ isActive }) => (isActive ? "Endpoints (current)" : "Endpoints")}
				</NavLinkish>
			</Slot>,
		);

		expect(getByRole("link")).toHaveTextContent("Endpoints (current)");
	});

	it("chains the Slot's event handler with the child's while composing a render prop", () => {
		const slotOnClick = vi.fn<() => void>();
		const childOnClick = vi.fn<() => void>();

		const { getByRole } = render(
			<Slot className="slot-class" onClick={slotOnClick}>
				<NavLinkish className={() => "is-active"} onClick={childOnClick}>
					Endpoints
				</NavLinkish>
			</Slot>,
		);

		const link = getByRole("link");
		expect(link).toHaveClass("is-active");

		link.click();

		// Radix still owns handler merging: withholding className and style from the
		// child leaves the rest of the merge untouched.
		expect(slotOnClick).toHaveBeenCalledTimes(1);
		expect(childOnClick).toHaveBeenCalledTimes(1);
	});

	it("composes the Slot's ref with the child's own ref", () => {
		// The child element is rebuilt to compose render props, so its own props —
		// `ref` included — have to survive that rebuild.
		const slotRef = createRef<HTMLAnchorElement>();
		const childRef = createRef<HTMLAnchorElement>();

		const { getByRole } = render(
			<Slot className="slot-class" ref={slotRef}>
				<a href="/endpoints" ref={childRef}>
					Endpoints
				</a>
			</Slot>,
		);

		const link = getByRole("link");
		expect(slotRef.current).toBe(link);
		expect(childRef.current).toBe(link);
	});
});

describe("Radix prop-merging contract", () => {
	it("forwards a slot prop the child does not declare untouched", () => {
		/**
		 * The one assumption `Slot`'s render-prop composition rests on, asserted
		 * directly rather than through mantle's output. Radix rewrites `className` and
		 * `style` only for keys it finds on the child element — that is why `Slot`
		 * withholds them from the child and hands the composed value to the slot
		 * instead. If a Radix upgrade starts touching props the child does not declare,
		 * this fails naming the contract, instead of a `NavLink` somewhere losing its
		 * highlight.
		 */
		const TripwireSlot = createSlot<HTMLElement, { className?: () => string }>("Tripwire");
		const received: Array<(() => string) | undefined> = [];
		const renderProp = () => "resolved-by-the-child";

		function ClassNameProbe({ className }: { className?: () => string }) {
			received.push(className);
			return <a href="/endpoints">Endpoints</a>;
		}

		render(
			<TripwireSlot className={renderProp}>
				<ClassNameProbe />
			</TripwireSlot>,
		);

		expect(received).toEqual([renderProp]);
	});
});

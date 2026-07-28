import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { Slot } from "./slot.js";

/**
 * Slot ships no styles of its own — className merging *is* its public contract,
 * documented at https://mantle.ngrok.com/components/primitives/slot#class-name-merging.
 * Every class asserted below is supplied by the test on the Slot, the child, or
 * both, and the assertions pin the merge outcome (which class won, which one
 * `tailwind-merge` dropped). These are override-contract assertions, not
 * internal-utility-class assertions, and are meant to stay.
 */
describe("Slot", () => {
	it("renders the child element unchanged when no Slot props are provided", () => {
		const { getByRole } = render(
			<Slot>
				<button className="child-class" type="button">
					Click me
				</button>
			</Slot>,
		);

		const button = getByRole("button", { name: "Click me" });

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

	it("applies Slot className and other props to a child that has no props of its own", () => {
		const { container } = render(
			<Slot className="slot-only-class" aria-label="Paragraph label">
				<p>Paragraph</p>
			</Slot>,
		);

		const paragraph = container.querySelector("p");

		if (paragraph == null) {
			throw new Error("Expected a <p> to be rendered");
		}

		expect(paragraph).toHaveClass("slot-only-class");
		expect(paragraph).toHaveAttribute("aria-label", "Paragraph label");
		expect(paragraph).toHaveTextContent("Paragraph");
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

	// `asChild` consumers routinely put their own ref on the child (e.g.
	// `<Button asChild><a ref={anchorRef} /></Button>`). Both refs have to land on
	// the same node — the Slot's ref must not clobber the child's.
	it("composes the Slot's ref with a ref the child already has", () => {
		const slotRef = createRef<HTMLButtonElement>();
		const childRef = createRef<HTMLButtonElement>();

		const { getByRole } = render(
			<Slot ref={slotRef}>
				<button ref={childRef} type="button">
					Click me
				</button>
			</Slot>,
		);

		const button = getByRole("button");

		expect(slotRef.current).toBe(button);
		expect(childRef.current).toBe(button);
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

	// Slot is the mechanism behind every `asChild` in the library, so its only
	// non-happy branch has to fail loudly: silently rendering the children would
	// drop the composing component's className, data-slot, and ref.
	it("throws when given a non-element child instead of silently dropping Slot props", () => {
		expect(() => render(<Slot className="slot-class">plain text</Slot>)).toThrow(
			/single React element/,
		);
	});

	it("throws when given more than one child", () => {
		expect(() =>
			render(
				<Slot className="slot-class">
					<button type="button">One</button>
					<button type="button">Two</button>
				</Slot>,
			),
		).toThrow(/single React element/);
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

	// The JSDoc promises the chain reads in DOM order "all the way down an
	// asChild chain", which only a multi-level composition can show: each Slot
	// has to prepend its own chain rather than replace what it received.
	it("accumulates the data-slot chain through nested asChild composition", () => {
		const { container } = render(
			<Slot data-slot="outer" className="px-4">
				<Slot data-slot="middle">
					<div data-slot="inner" className="px-2">
						Content
					</div>
				</Slot>
			</Slot>,
		);

		const div = container.querySelector("div");

		expect(div).toHaveAttribute("data-slot", "outer middle inner");
		// The innermost child still wins the className merge across the chain.
		expect(div).toHaveClass("px-2");
		expect(div).not.toHaveClass("px-4");
	});

	it("calls both the Slot's and the child's click handler exactly once with the click event", async () => {
		const user = userEvent.setup();
		const slotOnClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
		const childOnClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();

		const { getByRole } = render(
			<Slot onClick={slotOnClick}>
				<button type="button" onClick={childOnClick}>
					Click me
				</button>
			</Slot>,
		);

		const button = getByRole("button", { name: "Click me" });

		await user.click(button);

		// Radix Slot semantics: both handlers run, and neither is invoked twice by
		// the composition — a double-fire here would break every `asChild` consumer.
		expect(slotOnClick).toHaveBeenCalledTimes(1);
		expect(childOnClick).toHaveBeenCalledTimes(1);
		expect(slotOnClick).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: "click", target: button }),
		);
		expect(childOnClick).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: "click", target: button }),
		);
	});
});

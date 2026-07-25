import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { SvgOnly } from "./svg-only.js";

describe("SvgOnly", () => {
	// The class list IS the documented contract for this component: the Icon docs
	// page pins the merge order as (1) the SvgOnly base classes — "only `shrink-0`"
	// — (2) the SvgOnly className, (3) the svg's own className, with the last
	// conflicting utility winning. Nothing else observes which side of that order
	// won, so these assertions stay as class assertions.
	test("without any classNames, only applies the base class", () => {
		const { container } = render(<SvgOnly svg={<svg />} />);
		// `exact` backs the name's exclusivity claim (plain `toHaveClass` ignores
		// extras): SvgOnly adds one class and cx contributes no empty/undefined entry.
		expect(container.firstChild).toHaveClass("shrink-0", { exact: true });
	});

	test("when className is only specified on svg, applies the base class and svg className", () => {
		const { container } = render(<SvgOnly svg={<svg className="size-12 sm:size-16" />} />);
		expect(container.firstChild).toHaveClass("shrink-0 size-12 sm:size-16");
	});

	test("when className is only specified on SvgOnly, applies the base class and SvgOnly className", () => {
		const { container } = render(<SvgOnly className="size-20 sm:size-28" svg={<svg />} />);
		expect(container.firstChild).toHaveClass("shrink-0 size-20 sm:size-28");
	});

	test("when conflicting classes are specified on both svg and SvgOnly, applies the base class and svg className", () => {
		const { container } = render(
			<SvgOnly className="size-20 sm:size-28" svg={<svg className="size-12 sm:size-16" />} />,
		);
		expect(container.firstChild).toHaveClass("shrink-0 size-12 sm:size-16");
		// The svg's own sizing wins outright — the SvgOnly className is dropped
		// rather than left to fight it in the stylesheet.
		expect(container.firstChild).not.toHaveClass("size-20");
		expect(container.firstChild).not.toHaveClass("sm:size-28");
	});

	test("given 'shrink' on the svg, only has 'shrink' on the output", () => {
		const { container } = render(<SvgOnly svg={<svg className="shrink" />} />);
		expect(container.firstChild).toHaveClass("shrink");
		expect(container.firstChild).not.toHaveClass("shrink-0");
	});

	test("marks the cloned svg with the svg-only data slot", () => {
		const { container } = render(<SvgOnly svg={<svg />} />);
		expect(container.querySelector('[data-slot="svg-only"]')).toBe(container.firstChild);
	});

	test("a `data-slot` from props wins over the default", () => {
		// The default sits *before* the props spread precisely so wrappers like
		// `Icon` can rename the slot. Reordering the spread must fail here.
		const { container } = render(<SvgOnly data-slot="icon" svg={<svg />} />);
		expect(container.firstChild).toHaveAttribute("data-slot", "icon");
	});

	test("forwards arbitrary svg attributes to the cloned svg", () => {
		const { container } = render(<SvgOnly aria-hidden viewBox="0 0 16 16" svg={<svg />} />);
		const svg = container.firstChild;
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
	});

	test("merges styles with the svg's own style winning on conflicts", () => {
		const { container } = render(
			<SvgOnly style={{ color: "blue", opacity: 0.5 }} svg={<svg style={{ color: "red" }} />} />,
		);
		const svg = container.firstChild;
		expect(svg).toHaveStyle({ color: "red", opacity: "0.5" });
	});

	test("forwards `ref` to the cloned svg", () => {
		const ref = createRef<SVGSVGElement>();
		const { container } = render(<SvgOnly ref={ref} svg={<svg />} />);
		expect(ref.current).toBe(container.firstChild);
		expect(ref.current).toHaveAttribute("data-slot", "svg-only");
	});

	test.each([
		["a string", "not an svg"],
		["null", null],
		["two icons", [<svg key="a" />, <svg key="b" />]],
	])("throws when `svg` is %s", (_name, svg) => {
		expect(() => render(<SvgOnly svg={svg} />)).toThrow(
			"SvgOnly must be passed a single SVG icon as a JSX tag.",
		);
	});
});

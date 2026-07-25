import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Icon } from "./icon.js";

describe("Icon", () => {
	test("renames the slot to `icon` and applies the automatic sizing", () => {
		// Every mantle component that renders a consumer icon goes through
		// `Icon`, so `data-slot="icon"` is the public hook for all of them — it
		// only survives because `SvgOnly` puts its own default before the props
		// spread.
		const { container } = render(<Icon svg={<svg />} />);
		const icon = container.querySelector('[data-slot="icon"]');
		expect(icon).toBe(container.firstChild);
		// `size-5` is the whole of "automatic sizing" — Icon's entire reason to
		// exist over `SvgOnly` — and it has no data attribute or CSS variable to
		// observe it by. Losing it renders every mantle icon at the raw svg's
		// intrinsic size, and it is the default the two override tests below prove
		// a consumer beats, so the class is the contract here.
		expect(icon).toHaveClass("shrink-0", "size-5");
	});

	test("a consumer className overrides the automatic sizing", () => {
		const { container } = render(<Icon className="size-8" svg={<svg />} />);
		expect(container.firstChild).toHaveClass("size-8");
		expect(container.firstChild).not.toHaveClass("size-5");
	});

	test("the svg's own className wins over the consumer className", () => {
		const { container } = render(<Icon className="size-8" svg={<svg className="size-3" />} />);
		expect(container.firstChild).toHaveClass("size-3");
		expect(container.firstChild).not.toHaveClass("size-8");
		expect(container.firstChild).not.toHaveClass("size-5");
	});

	test("forwards `style` to the svg", () => {
		const { container } = render(<Icon style={{ color: "red" }} svg={<svg />} />);
		expect(container.firstChild).toHaveStyle({ color: "red" });
	});

	test("forwards arbitrary svg attributes", () => {
		const { container } = render(<Icon aria-hidden role="presentation" svg={<svg />} />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
		expect(container.firstChild).toHaveAttribute("role", "presentation");
	});

	test("a `data-slot` from props wins over the icon default", () => {
		const { container } = render(<Icon data-slot="alert-icon" svg={<svg />} />);
		expect(container.firstChild).toHaveAttribute("data-slot", "alert-icon");
	});

	test("forwards `ref` to the svg", () => {
		const ref = createRef<SVGSVGElement>();
		const { container } = render(<Icon ref={ref} svg={<svg />} />);
		expect(ref.current).toBe(container.firstChild);
		expect(ref.current).toHaveAttribute("data-slot", "icon");
	});

	test("throws when `svg` is not a single element", () => {
		expect(() => render(<Icon svg="not an svg" />)).toThrow(
			"SvgOnly must be passed a single SVG icon as a JSX tag.",
		);
	});
});

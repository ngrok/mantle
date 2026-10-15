import { WarningIcon } from "@phosphor-icons/react/Warning";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SvgOnly } from "./svg-only.js";

describe("SvgOnly", () => {
	test("passes the svg className through", () => {
		const { container } = render(<SvgOnly svg={<svg className="size-12 sm:size-16" />} />);
		// The tailwind-merge contract: the svg's own classes survive the merge onto the part.
		expect(container.firstChild).toHaveClass("size-12 sm:size-16");
	});

	test("passes the SvgOnly className through", () => {
		const { container } = render(<SvgOnly className="size-20 sm:size-28" svg={<svg />} />);
		// The tailwind-merge contract: the consumer's className survives the merge onto the svg.
		expect(container.firstChild).toHaveClass("size-20 sm:size-28");
	});

	test("when svg and SvgOnly carry conflicting size classes, the svg classes replace the SvgOnly classes", () => {
		const { container } = render(
			<SvgOnly className="size-20 sm:size-28" svg={<svg className="size-12 sm:size-16" />} />,
		);
		// Why the exact attribute: this is a tailwind-merge override contract.
		// `toHaveClass` ignores extra classes, so only the full value pins the merge.
		expect(container.firstChild).toHaveAttribute("class", "shrink-0 size-12 sm:size-16");
	});

	test("given 'shrink' on the svg, 'shrink' replaces the default 'shrink-0'", () => {
		const { container } = render(<SvgOnly svg={<svg className="shrink" />} />);
		// Why the exact attribute: this is a tailwind-merge override contract.
		// `toHaveClass` ignores extra classes, so only the full value pins the merge.
		expect(container.firstChild).toHaveAttribute("class", "shrink");
	});

	test("stamps the svg-only slot on the cloned svg", () => {
		const { container } = render(<SvgOnly svg={<svg />} />);
		expect(container.firstChild).toHaveAttribute("data-slot", "svg-only");
	});

	test("a data-slot from props joins ahead of the svg-only slot", () => {
		// Wrappers such as `Icon` name their own slot this way.
		const { container } = render(<SvgOnly data-slot="alert-icon" svg={<svg />} />);
		expect(container.firstChild).toHaveAttribute("data-slot", "alert-icon svg-only");
	});

	test("merges styles, with the svg's own style winning on conflicts", () => {
		const { container } = render(
			<SvgOnly style={{ color: "blue", opacity: 0.5 }} svg={<svg style={{ color: "red" }} />} />,
		);
		expect(container.firstChild).toHaveStyle({ color: "red", opacity: "0.5" });
	});

	test.each([
		["null", null],
		["two icons", [<svg key="a" />, <svg key="b" />]],
	])("throws when `svg` is %s", (_name, svg) => {
		// React logs the render error itself; silence it so the run output stays readable.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<SvgOnly svg={svg} />)).toThrow(
			"SvgOnly must be passed a single SVG icon as a JSX tag.",
		);
	});

	describe("decorative by default", () => {
		test("a bare svg renders aria-hidden", () => {
			const { container } = render(<SvgOnly svg={<svg />} />);
			expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
		});

		test("aria-hidden={false} on SvgOnly keeps the svg exposed", () => {
			const { container } = render(<SvgOnly aria-hidden={false} svg={<svg />} />);
			expect(container.firstChild).toHaveAttribute("aria-hidden", "false");
		});

		test("a role and aria-label on SvgOnly name the svg and skip aria-hidden", () => {
			render(<SvgOnly role="img" aria-label="Shrimp" svg={<svg />} />);
			const image = screen.getByRole("img", { name: "Shrimp" });
			expect(image).not.toHaveAttribute("aria-hidden");
		});

		test("an aria-label on the svg element itself skips aria-hidden", () => {
			render(<SvgOnly svg={<svg role="img" aria-label="Shrimp" />} />);
			const image = screen.getByRole("img", { name: "Shrimp" });
			expect(image).not.toHaveAttribute("aria-hidden");
		});

		test("a <title> child names the svg and skips aria-hidden", () => {
			const { container } = render(
				<SvgOnly
					svg={
						<svg>
							<title>Warning</title>
						</svg>
					}
				/>,
			);
			expect(screen.getByTitle("Warning")).toBeInTheDocument();
			expect(container.querySelector("svg")).not.toHaveAttribute("aria-hidden");
		});

		test("a Phosphor alt names the svg and skips aria-hidden", () => {
			const { container } = render(<SvgOnly svg={<WarningIcon alt="Warning" />} />);
			expect(screen.getByTitle("Warning")).toBeInTheDocument();
			expect(container.querySelector("svg")).not.toHaveAttribute("aria-hidden");
		});

		test("aria-labelledby on the svg element skips aria-hidden", () => {
			const { container } = render(
				<>
					<span id="shrimp-label">Shrimp</span>
					<SvgOnly svg={<svg aria-labelledby="shrimp-label" />} />
				</>,
			);
			expect(container.querySelector("svg")).not.toHaveAttribute("aria-hidden");
		});
	});
});

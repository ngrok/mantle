import { WarningIcon } from "@phosphor-icons/react/Warning";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SvgOnly } from "./svg-only.js";

describe("SvgOnly", () => {
	test("passes the svg className through", () => {
		const { container } = render(<SvgOnly svg={<svg className="size-12 sm:size-16" />} />);
		expect(container.firstChild).toHaveClass("size-12 sm:size-16");
	});

	test("passes the SvgOnly className through", () => {
		const { container } = render(<SvgOnly className="size-20 sm:size-28" svg={<svg />} />);
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

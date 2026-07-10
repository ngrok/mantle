import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { buildPath, QrCode } from "./qr-code.js";

/**
 * Renders the minimal valid composition used across most assertions.
 */
function renderQrCode(props?: Partial<Parameters<typeof QrCode.Root>[0]>) {
	return render(
		<QrCode.Root value="https://ngrok.com" data-testid="root" {...props}>
			<QrCode.Frame data-testid="frame">
				<QrCode.Pattern data-testid="pattern" />
			</QrCode.Frame>
		</QrCode.Root>,
	);
}

describe("buildPath", () => {
	test("emits an SVG rect command per dark module, scaled by pixelSize", () => {
		// 2x2 grid: top-left and bottom-right modules are dark.
		const grid = [
			[true, false],
			[false, true],
		];
		expect(buildPath(grid, 10)).toBe("M0,0h10v10h-10zM10,10h10v10h-10z");
	});

	test("scales coordinates by pixelSize", () => {
		expect(buildPath([[false, true]], 4)).toBe("M4,0h4v4h-4z");
	});

	test("returns an empty string when no modules are dark", () => {
		expect(
			buildPath(
				[
					[false, false],
					[false, false],
				],
				10,
			),
		).toBe("");
	});
});

describe("QrCode", () => {
	test("Root renders a div with its data-slot", () => {
		renderQrCode();
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "qr-code");
	});

	test("Root merges custom className with its defaults", () => {
		renderQrCode({ className: "custom-class" });
		const root = screen.getByTestId("root");
		expect(root.className).toContain("custom-class");
		expect(root.className).toContain("bg-static-white");
	});

	test("Root forwards ref to the underlying div", () => {
		const ref = createRef<HTMLDivElement>();
		renderQrCode({ ref });
		expect(ref.current).not.toBeNull();
		expect(ref.current?.tagName).toBe("DIV");
	});

	test("Root forwards arbitrary data-* props", () => {
		render(
			<QrCode.Root value="https://ngrok.com" data-testid="root" data-analytics-id="mfa-qr">
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>
			</QrCode.Root>,
		);
		expect(screen.getByTestId("root")).toHaveAttribute("data-analytics-id", "mfa-qr");
	});

	test("Frame renders an svg with its data-slot", () => {
		renderQrCode();
		const frame = screen.getByTestId("frame");
		expect(frame.tagName.toLowerCase()).toBe("svg");
		expect(frame).toHaveAttribute("data-slot", "qr-code-frame");
	});

	test("Frame renders modules with crisp SVG edges", () => {
		renderQrCode();
		expect(screen.getByTestId("frame")).toHaveAttribute("shape-rendering", "crispEdges");
	});

	test("Pattern renders a path that encodes the value into a non-empty `d`", () => {
		renderQrCode();
		const pattern = screen.getByTestId("pattern");
		expect(pattern.tagName.toLowerCase()).toBe("path");
		expect(pattern).toHaveAttribute("data-slot", "qr-code-pattern");
		expect(pattern.getAttribute("d")).toBeTruthy();
	});

	test("different values produce different encoded patterns", () => {
		const { container: a } = render(
			<QrCode.Root value="https://ngrok.com">
				<QrCode.Frame>
					<QrCode.Pattern data-testid="pattern-a" />
				</QrCode.Frame>
			</QrCode.Root>,
		);
		const { container: b } = render(
			<QrCode.Root value="https://example.com">
				<QrCode.Frame>
					<QrCode.Pattern data-testid="pattern-b" />
				</QrCode.Frame>
			</QrCode.Root>,
		);
		const pathA = a.querySelector('[data-slot="qr-code-pattern"]')?.getAttribute("d");
		const pathB = b.querySelector('[data-slot="qr-code-pattern"]')?.getAttribute("d");
		expect(pathA).toBeTruthy();
		expect(pathB).toBeTruthy();
		expect(pathA).not.toBe(pathB);
	});

	test("the `ecc` prop changes the encoded pattern", () => {
		const renderWith = (ecc: "L" | "H") => {
			const { container } = render(
				<QrCode.Root value="https://ngrok.com" ecc={ecc}>
					<QrCode.Frame>
						<QrCode.Pattern />
					</QrCode.Frame>
				</QrCode.Root>,
			);
			return container.querySelector('[data-slot="qr-code-pattern"]')?.getAttribute("d") ?? "";
		};
		// Higher error correction adds recovery data, so the same value encodes differently.
		expect(renderWith("L")).not.toBe(renderWith("H"));
	});

	test("a smaller `quietZone` shrinks the encoded grid and the Frame viewBox", () => {
		const viewBoxWith = (quietZone?: number) => {
			const { container } = render(
				<QrCode.Root value="https://ngrok.com" quietZone={quietZone}>
					<QrCode.Frame>
						<QrCode.Pattern />
					</QrCode.Frame>
				</QrCode.Root>,
			);
			return container.querySelector('[data-slot="qr-code-frame"]')?.getAttribute("viewBox") ?? "";
		};
		// viewBox is "0 0 <size> <size>"; the quiet zone is baked into the grid, so a
		// tighter margin yields a smaller square than the spec-recommended default of 4.
		const sizeOf = (viewBox: string) => Number(viewBox.split(" ")[2]);
		expect(sizeOf(viewBoxWith(1))).toBeLessThan(sizeOf(viewBoxWith()));
	});

	test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		"throws a helpful error for invalid pixelSize %s",
		(pixelSize) => {
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => renderQrCode({ pixelSize })).toThrow(/pixelSize/);
			consoleError.mockRestore();
		},
	);

	test.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"throws a helpful error for invalid quietZone %s",
		(quietZone) => {
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => renderQrCode({ quietZone })).toThrow(/quietZone/);
			consoleError.mockRestore();
		},
	);

	test("Overlay renders a centered container with its children", () => {
		render(
			<QrCode.Root value="https://ngrok.com">
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>
				<QrCode.Overlay data-testid="overlay">
					<span>logo</span>
				</QrCode.Overlay>
			</QrCode.Root>,
		);
		const overlay = screen.getByTestId("overlay");
		expect(overlay.tagName).toBe("DIV");
		expect(overlay).toHaveAttribute("data-slot", "qr-code-overlay");
		expect(overlay).toHaveTextContent("logo");
	});

	test("throws a helpful error when a part is rendered outside QrCode.Root", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>,
			),
		).toThrow(/must be rendered inside a `QrCode.Root`/);
		consoleError.mockRestore();
	});

	test("Root renders as its child element when asChild is true, forwarding class and data-slot", () => {
		render(
			<QrCode.Root asChild value="https://ngrok.com" className="custom-class">
				<section data-testid="root">
					<QrCode.Frame>
						<QrCode.Pattern />
					</QrCode.Frame>
				</section>
			</QrCode.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "qr-code");
		expect(root.className).toContain("custom-class");
	});
});

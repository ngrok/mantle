import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import * as QrCode from "./qr-code-parts.js";

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

describe("QrCode", () => {
	test("Root carries its data-slot", () => {
		renderQrCode();
		expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "qr-code");
	});

	test("a consumer className wins over the default tile background", () => {
		// tailwind-merge override contract: the consumer's utility replaces the
		// conflicting default instead of sitting next to it.
		renderQrCode({ className: "bg-red-500" });
		const root = screen.getByTestId("root");
		expect(root.className).toContain("bg-red-500");
		expect(root.className).not.toContain("bg-static-white");
	});

	test("Root forwards ref to the underlying div", () => {
		const ref = createRef<HTMLDivElement>();
		renderQrCode({ ref });
		expect(ref.current).toBe(screen.getByTestId("root"));
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

	test("Frame carries its data-slot", () => {
		renderQrCode();
		expect(screen.getByTestId("frame")).toHaveAttribute("data-slot", "qr-code-frame");
	});

	test("Frame is an image named 'QR code' when no label is passed", () => {
		renderQrCode();
		const frame = screen.getByRole("img", { name: "QR code" });
		expect(frame).toBe(screen.getByTestId("frame"));
	});

	test("Frame uses the aria-label you pass", () => {
		render(
			<QrCode.Root value="https://ngrok.com">
				<QrCode.Frame aria-label="QR code for ngrok.com">
					<QrCode.Pattern />
				</QrCode.Frame>
			</QrCode.Root>,
		);
		expect(screen.getByRole("img", { name: "QR code for ngrok.com" })).toBeInTheDocument();
		expect(screen.queryByRole("img", { name: "QR code" })).not.toBeInTheDocument();
	});

	test("Frame drops the fallback aria-label when aria-labelledby names it", () => {
		render(
			<>
				<p id="qr-title">Scan to open the dashboard</p>
				<QrCode.Root value="https://ngrok.com">
					<QrCode.Frame aria-labelledby="qr-title" data-testid="frame">
						<QrCode.Pattern />
					</QrCode.Frame>
				</QrCode.Root>
			</>,
		);
		const frame = screen.getByRole("img", { name: "Scan to open the dashboard" });
		expect(frame).toBe(screen.getByTestId("frame"));
		expect(frame).not.toHaveAttribute("aria-label");
	});

	test("Frame renders modules with crisp SVG edges", () => {
		renderQrCode();
		expect(screen.getByTestId("frame")).toHaveAttribute("shape-rendering", "crispEdges");
	});

	test("Pattern carries its data-slot", () => {
		renderQrCode();
		expect(screen.getByTestId("pattern")).toHaveAttribute("data-slot", "qr-code-pattern");
	});

	test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		"throws a helpful error for invalid pixelSize %s",
		(pixelSize) => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => renderQrCode({ pixelSize })).toThrow(/pixelSize/);
		},
	);

	test.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"throws a helpful error for invalid quietZone %s",
		(quietZone) => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => renderQrCode({ quietZone })).toThrow(/quietZone/);
		},
	);

	test("Overlay renders its children with its data-slot", () => {
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
		expect(overlay).toHaveAttribute("data-slot", "qr-code-overlay");
		expect(overlay).toHaveTextContent("logo");
	});

	test("throws a helpful error when a part is rendered outside QrCode.Root", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<QrCode.Frame>
					<QrCode.Pattern />
				</QrCode.Frame>,
			),
		).toThrow(/must be rendered inside a `QrCode.Root`/);
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
		// Why tagName and the class check: the asChild swap renders the child element in
		// place of the div, and the tailwind-merge contract puts the consumer's class on it.
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "qr-code");
		expect(root.className).toContain("custom-class");
	});
});

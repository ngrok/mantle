import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { LiveRegion } from "./live-region.js";

describe("LiveRegion", () => {
	test("renders a polite status region by default", () => {
		render(<LiveRegion data-testid="region">Draft saved</LiveRegion>);
		const region = screen.getByTestId("region");
		expect(region.tagName).toBe("SPAN");
		expect(region).toHaveAttribute("data-slot", "live-region");
		expect(region).toHaveAttribute("role", "status");
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveAttribute("aria-atomic", "true");
		expect(region).toHaveTextContent("Draft saved");
	});

	test("renders an alert region when politeness is assertive", () => {
		render(
			<LiveRegion data-testid="region" politeness="assertive">
				Session expired
			</LiveRegion>,
		);
		const region = screen.getByTestId("region");
		expect(region).toHaveAttribute("role", "alert");
		expect(region).toHaveAttribute("aria-live", "assertive");
	});

	test("is visually hidden by the sr-only class", () => {
		render(<LiveRegion data-testid="region">Draft saved</LiveRegion>);
		// The class is the only observable implementation of the hiding contract:
		// happy-dom computes no layout, so the clipping itself is not assertable.
		expect(screen.getByTestId("region").className.split(" ")).toContain("sr-only");
	});

	test("keeps the same element mounted across message changes", () => {
		const { rerender } = render(<LiveRegion data-testid="region">3 results found</LiveRegion>);
		const region = screen.getByTestId("region");
		rerender(<LiveRegion data-testid="region">5 results found</LiveRegion>);
		// Same node: screen readers only announce text that changes inside an
		// existing region, so a remount would silently break the contract.
		expect(screen.getByTestId("region")).toBe(region);
		expect(region).toHaveTextContent("5 results found");
	});

	test("stays mounted and empty before the first message", () => {
		render(<LiveRegion data-testid="region" />);
		const region = screen.getByTestId("region");
		expect(region).toHaveAttribute("role", "status");
		expect(region.textContent).toBe("");
	});

	test("server-renders the region so it exists before hydration", () => {
		const html = renderToString(<LiveRegion />);
		expect(html).toContain('role="status"');
		expect(html).toContain('aria-live="polite"');
	});

	test("lets a consumer's role prop win over the derived role", () => {
		render(
			<LiveRegion data-testid="region" role="log">
				new chat message
			</LiveRegion>,
		);
		expect(screen.getByTestId("region")).toHaveAttribute("role", "log");
	});

	test("forwards ref to the underlying span", () => {
		const ref = createRef<HTMLSpanElement>();
		render(<LiveRegion ref={ref}>Draft saved</LiveRegion>);
		expect(ref.current).toBe(screen.getByText("Draft saved"));
	});

	test("forwards arbitrary data-* props", () => {
		render(
			<LiveRegion data-testid="region" data-analytics-id="route-announcer">
				Dashboard
			</LiveRegion>,
		);
		expect(screen.getByTestId("region")).toHaveAttribute("data-analytics-id", "route-announcer");
	});

	test("asChild renders its child, merging classes, attributes, and the ref onto it", () => {
		const ref = createRef<HTMLParagraphElement>();
		render(
			<LiveRegion asChild className="custom-class" politeness="assertive">
				<p data-testid="region" ref={ref}>
					Session expired
				</p>
			</LiveRegion>,
		);
		const region = screen.getByTestId("region");
		expect(region.tagName).toBe("P");
		expect(region).toHaveAttribute("data-slot", "live-region");
		expect(region).toHaveAttribute("role", "alert");
		expect(region).toHaveAttribute("aria-live", "assertive");
		// Split before matching: a substring check would also match `not-sr-only`.
		const classes = region.className.split(" ");
		expect(classes).toContain("custom-class");
		expect(classes).toContain("sr-only");
		expect(ref.current).toBe(region);
	});
});

import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import * as StatusStrip from "./status-strip-parts.js";

describe("StatusStrip.Root", () => {
	test("is an image named by its aria-label", () => {
		render(
			<StatusStrip.Root aria-label="In stock 50% of the last 2 hours">
				<StatusStrip.Cell value={1} />
				<StatusStrip.Cell value={0} />
			</StatusStrip.Root>,
		);
		const strip = screen.getByRole("img", { name: "In stock 50% of the last 2 hours" });
		expect(strip).toHaveAttribute("data-slot", "status-strip");
	});

	test("takes its name from aria-labelledby", () => {
		render(
			<>
				<p id="summary">Up 99% of the last day</p>
				<StatusStrip.Root aria-labelledby="summary">
					<StatusStrip.Cell value={1} />
				</StatusStrip.Root>
			</>,
		);
		expect(screen.getByRole("img", { name: "Up 99% of the last day" })).toBeInTheDocument();
	});

	test("aria-hidden drops the image role and hides the strip", () => {
		render(
			<StatusStrip.Root aria-hidden data-testid="strip">
				<StatusStrip.Cell value={1} />
			</StatusStrip.Root>,
		);
		const strip = screen.getByTestId("strip");
		expect(strip).toHaveAttribute("aria-hidden", "true");
		expect(strip).not.toHaveAttribute("role");
		expect(screen.queryByRole("img")).toBeNull();
	});

	test("throws when its label is empty and it is not hidden", () => {
		expect(() => render(<StatusStrip.Root aria-label="" />)).toThrow(
			/needs aria-label or aria-labelledby/,
		);
	});

	test("forwards className, ref, and data attributes, with the consumer's class last", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<StatusStrip.Root
				aria-label="Strip"
				className="h-4"
				data-state="ok"
				data-slot="card"
				ref={ref}
			/>,
		);
		const strip = screen.getByRole("img", { name: "Strip" });
		expect(ref.current).toBe(strip);
		expect(strip).toHaveAttribute("data-state", "ok");
		expect(strip).toHaveAttribute("data-slot", "card status-strip");
		expect(strip.className.endsWith("h-4")).toBe(true);
	});

	test("asChild renders the child with the role, the name, the slot, the classes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<StatusStrip.Root aria-label="Strip" asChild className="h-4" ref={ref}>
				<div className="mt-2" data-testid="child" />
			</StatusStrip.Root>,
		);
		const strip = screen.getByRole("img", { name: "Strip" });
		expect(strip).toBe(screen.getByTestId("child"));
		expect(ref.current).toBe(strip);
		expect(strip).toHaveAttribute("data-slot", "status-strip");
		expect(strip).toHaveClass("h-4", "mt-2");
	});
});

describe("StatusStrip.Cell", () => {
	test.each([
		[null, "no-data"],
		[0, "none"],
		[0.01, "some"],
		[0.99, "some"],
		[1, "all"],
	] as const)("value %s stamps data-share=%s", (value, share) => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Cell value={value} data-testid="cell" />
			</StatusStrip.Root>,
		);
		expect(screen.getByTestId("cell")).toHaveAttribute("data-share", share);
	});

	test("writes its share to --_status-strip-value, and no data writes 0", () => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Cell value={0.25} data-testid="some" style={{ opacity: 0.5 }} />
				<StatusStrip.Cell value={null} data-testid="no-data" />
			</StatusStrip.Root>,
		);
		const some = screen.getByTestId("some");
		expect(some.style.getPropertyValue("--_status-strip-value")).toBe("0.25");
		expect(some.style.opacity).toBe("0.5");
		expect(screen.getByTestId("no-data").style.getPropertyValue("--_status-strip-value")).toBe("0");
	});

	test.each([Number.NaN, -0.1, 1.1])("throws for value %s", (value) => {
		expect(() =>
			render(
				<StatusStrip.Root aria-hidden>
					<StatusStrip.Cell value={value} />
				</StatusStrip.Root>,
			),
		).toThrow(/from 0 to 1, or null for no data/);
	});

	test("keeps its own title", () => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Cell value={0} title="11:00 UTC: sold out" data-testid="cell" />
			</StatusStrip.Root>,
		);
		expect(screen.getByTestId("cell")).toHaveAttribute("title", "11:00 UTC: sold out");
	});

	test("asChild renders the child with the share, the slot, the classes, and the ref", () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Cell value={0.5} asChild className="w-2" ref={ref}>
					<a href="#day-3" className="block" data-testid="cell">
						Day 3
					</a>
				</StatusStrip.Cell>
			</StatusStrip.Root>,
		);
		const cell = screen.getByTestId("cell");
		expect(ref.current).toBe(cell);
		expect(cell).toHaveAttribute("href", "#day-3");
		expect(cell).toHaveAttribute("data-share", "some");
		expect(cell).toHaveAttribute("data-slot", "status-strip-cell");
		expect(cell).toHaveClass("w-2", "block");
	});

	test("renders its final share on the server", () => {
		const html = renderToString(
			<StatusStrip.Root aria-label="Strip">
				<StatusStrip.Cell value={0.5} />
			</StatusStrip.Root>,
		);
		expect(html).toContain('role="img"');
		expect(html).toContain('data-share="some"');
		expect(html).toContain("--_status-strip-value:0.5");
	});
});

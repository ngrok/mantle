import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import * as StatusStrip from "./status-strip-parts.js";
import type { StatusStripSegmentProps } from "./status-strip.js";

describe("StatusStrip.Root", () => {
	test("is an image named by its aria-label", () => {
		render(
			<StatusStrip.Root aria-label="In stock 50% of the last 2 hours">
				<StatusStrip.Segment value={1} />
				<StatusStrip.Segment value={0} />
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
					<StatusStrip.Segment value={1} />
				</StatusStrip.Root>
			</>,
		);
		expect(screen.getByRole("img", { name: "Up 99% of the last day" })).toBeInTheDocument();
	});

	test("aria-hidden drops the image role and hides the strip", () => {
		render(
			<StatusStrip.Root aria-hidden data-testid="strip">
				<StatusStrip.Segment value={1} />
			</StatusStrip.Root>,
		);
		const strip = screen.getByTestId("strip");
		expect(strip).toHaveAttribute("aria-hidden", "true");
		expect(strip).not.toHaveAttribute("role");
		expect(screen.queryByRole("img")).toBeNull();
	});

	test.each([
		["an empty label", { "aria-label": "" }],
		["a blank label", { "aria-label": "  " }],
		["a blank labelledby", { "aria-labelledby": " " }],
	] as const)("throws for %s when it is not hidden", (_case, props) => {
		expect(() => render(<StatusStrip.Root {...props} />)).toThrow(
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

	test("asChild keeps the root's role and name over the child's own", () => {
		render(
			<StatusStrip.Root aria-label="Strip" asChild>
				<div role="list" aria-label="Child" data-testid="child" />
			</StatusStrip.Root>,
		);
		expect(screen.getByRole("img", { name: "Strip" })).toBe(screen.getByTestId("child"));
	});

	test("asChild throws for a fragment, which renders no element to carry the role", () => {
		expect(() =>
			render(
				<StatusStrip.Root aria-label="Strip" asChild>
					<>
						<StatusStrip.Segment value={1} />
						<StatusStrip.Segment value={0} />
					</>
				</StatusStrip.Root>,
			),
		).toThrow(/needs one element child, not a fragment/);
	});

	test("asChild with aria-hidden drops the child's role", () => {
		render(
			<StatusStrip.Root aria-hidden asChild>
				<div role="img" aria-label="Child" data-testid="child" />
			</StatusStrip.Root>,
		);
		const strip = screen.getByTestId("child");
		expect(strip).toHaveAttribute("aria-hidden", "true");
		expect(strip).not.toHaveAttribute("role");
	});
});

describe("StatusStrip.Segment", () => {
	test.each([
		[null, "no-data"],
		[0, "none"],
		[0.01, "some"],
		[0.99, "some"],
		[1, "all"],
	] as const)("value %s stamps data-share=%s", (value, share) => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Segment value={value} data-testid="segment" />
			</StatusStrip.Root>,
		);
		expect(screen.getByTestId("segment")).toHaveAttribute("data-share", share);
	});

	test("writes its share to --_status-strip-value, and no data writes 0", () => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Segment value={0.25} data-testid="some" style={{ opacity: 0.5 }} />
				<StatusStrip.Segment value={null} data-testid="no-data" />
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
					<StatusStrip.Segment value={value} />
				</StatusStrip.Root>,
			),
		).toThrow(/from 0 to 1, or null for no data/);
	});

	test.each([undefined, "0.5"])("throws for a JavaScript caller's value %j", (value) => {
		// Why the cast: the type rejects these values; the check guards JavaScript and untyped data.
		const props = { value } as unknown as StatusStripSegmentProps;
		expect(() =>
			render(
				<StatusStrip.Root aria-hidden>
					<StatusStrip.Segment {...props} />
				</StatusStrip.Root>,
			),
		).toThrow(/from 0 to 1, or null for no data/);
	});

	test("keeps the share of its value over a forwarded data-share", () => {
		// Why a record: an ancestor can forward `data-share` through a spread.
		const forwarded: Record<string, string> = { "data-share": "none" };
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Segment value={null} data-testid="segment" {...forwarded} />
			</StatusStrip.Root>,
		);
		expect(screen.getByTestId("segment")).toHaveAttribute("data-share", "no-data");
	});

	test("keeps its own title", () => {
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Segment value={0} title="11:00 UTC: sold out" data-testid="segment" />
			</StatusStrip.Root>,
		);
		expect(screen.getByTestId("segment")).toHaveAttribute("title", "11:00 UTC: sold out");
	});

	test("asChild renders the child with the share, the slot, the classes, and the ref", () => {
		const ref = createRef<HTMLElement>();
		render(
			<StatusStrip.Root aria-hidden>
				<StatusStrip.Segment value={0.5} asChild className="w-2" ref={ref}>
					<i className="block" data-day="3" data-testid="segment" />
				</StatusStrip.Segment>
			</StatusStrip.Root>,
		);
		const segment = screen.getByTestId("segment");
		expect(ref.current).toBe(segment);
		expect(segment).toHaveAttribute("data-day", "3");
		expect(segment).toHaveAttribute("data-share", "some");
		expect(segment).toHaveAttribute("data-slot", "status-strip-segment");
		expect(segment).toHaveClass("w-2", "block");
	});

	test("renders its final share on the server", () => {
		const html = renderToString(
			<StatusStrip.Root aria-label="Strip">
				<StatusStrip.Segment value={0.5} />
			</StatusStrip.Root>,
		);
		expect(html).toContain('role="img"');
		expect(html).toContain('data-share="some"');
		expect(html).toContain("--_status-strip-value:0.5");
	});
});

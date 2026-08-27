import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { VisuallyHidden } from "./visually-hidden.js";

describe("VisuallyHidden", () => {
	test("renders a span with its data-slot and the sr-only class", () => {
		render(<VisuallyHidden data-testid="hidden">(opens in a new tab)</VisuallyHidden>);
		const element = screen.getByTestId("hidden");
		expect(element.tagName).toBe("SPAN");
		expect(element).toHaveAttribute("data-slot", "visually-hidden");
		// The class is the only observable implementation of the hiding contract:
		// happy-dom computes no layout, so the clipping itself is not assertable.
		expect(element.className.split(" ")).toContain("sr-only");
		expect(element).toHaveTextContent("(opens in a new tab)");
	});

	test("lets the consumer's not-sr-only replace the default sr-only", () => {
		render(
			<VisuallyHidden data-testid="hidden" className="not-sr-only">
				visible after all
			</VisuallyHidden>,
		);
		// A tailwind-merge override contract: `sr-only` and `not-sr-only` share a
		// merge group, so the consumer's class replaces the default rather than
		// landing beside it.
		const classes = screen.getByTestId("hidden").className.split(" ");
		expect(classes).toContain("not-sr-only");
		expect(classes).not.toContain("sr-only");
	});

	test("forwards ref to the underlying span", () => {
		const ref = createRef<HTMLSpanElement>();
		render(<VisuallyHidden ref={ref}>screen reader text</VisuallyHidden>);
		expect(ref.current).toBe(screen.getByText("screen reader text"));
	});

	test("forwards arbitrary data-* props", () => {
		render(
			<VisuallyHidden data-testid="hidden" data-analytics-id="sr-note">
				note
			</VisuallyHidden>,
		);
		expect(screen.getByTestId("hidden")).toHaveAttribute("data-analytics-id", "sr-note");
	});

	test("asChild renders its child, merging classes, data-slot, and the ref onto it", () => {
		const ref = createRef<HTMLTableCaptionElement>();
		render(
			<table>
				<VisuallyHidden asChild className="custom-class">
					<caption data-testid="caption" ref={ref}>
						Monthly revenue by region
					</caption>
				</VisuallyHidden>
				<tbody>
					<tr>
						<td>North</td>
					</tr>
				</tbody>
			</table>,
		);
		const caption = screen.getByTestId("caption");
		expect(caption.tagName).toBe("CAPTION");
		expect(caption).toHaveAttribute("data-slot", "visually-hidden");
		// Split before matching: a substring check would also match `not-sr-only`.
		const classes = caption.className.split(" ");
		expect(classes).toContain("custom-class");
		expect(classes).toContain("sr-only");
		expect(ref.current).toBe(caption);
	});
});

import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Kbd } from "./kbd.js";

describe("Kbd", () => {
	test("renders a kbd element with its data-slot", () => {
		render(<Kbd data-testid="kbd">K</Kbd>);
		const kbd = screen.getByTestId("kbd");
		expect(kbd.tagName).toBe("KBD");
		expect(kbd).toHaveAttribute("data-slot", "kbd");
		expect(kbd).toHaveTextContent("K");
	});

	test("lets the consumer's className win over the defaults it conflicts with", () => {
		render(
			<Kbd data-testid="kbd" className="font-sans">
				K
			</Kbd>,
		);
		// A tailwind-merge override contract: the consumer's font family replaces the
		// default `font-mono` rather than landing beside it.
		const kbd = screen.getByTestId("kbd");
		expect(kbd.className).toContain("font-sans");
		expect(kbd.className).not.toContain("font-mono");
	});

	test("forwards ref to the underlying kbd element", () => {
		const ref = createRef<HTMLElement>();
		render(<Kbd ref={ref}>K</Kbd>);
		expect(ref.current?.tagName).toBe("KBD");
	});

	test("forwards aria-label so a symbol-only key gets an accessible name", () => {
		render(<Kbd aria-label="Command">⌘</Kbd>);
		expect(screen.getByLabelText("Command")).toHaveTextContent("⌘");
	});

	test('renders translate="no" so a translation engine skips the key', () => {
		render(<Kbd data-testid="kbd">Enter</Kbd>);
		expect(screen.getByTestId("kbd")).toHaveAttribute("translate", "no");
	});

	test('keeps translate="no" when a call site passes translate', () => {
		render(
			// @ts-expect-error `translate` is omitted from the props type on purpose. This
			// pins the runtime guard for a caller who spreads a wider props object past it.
			<Kbd data-testid="kbd" translate="yes">
				Enter
			</Kbd>,
		);
		expect(screen.getByTestId("kbd")).toHaveAttribute("translate", "no");
	});
});

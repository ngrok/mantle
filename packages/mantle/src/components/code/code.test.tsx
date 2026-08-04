import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Code } from "./code.js";

describe("Code", () => {
	test("renders a code element with its data-slot", () => {
		render(<Code data-testid="code">npm install</Code>);
		const code = screen.getByTestId("code");
		expect(code.tagName).toBe("CODE");
		expect(code).toHaveAttribute("data-slot", "code");
		expect(code).toHaveTextContent("npm install");
	});

	test("lets the consumer's className win over the defaults it conflicts with", () => {
		render(
			<Code data-testid="code" className="font-sans">
				npm install
			</Code>,
		);
		// A tailwind-merge override contract: the consumer's font family replaces the
		// default `font-mono` rather than landing beside it.
		const code = screen.getByTestId("code");
		expect(code.className).toContain("font-sans");
		expect(code.className).not.toContain("font-mono");
	});

	test("forwards ref to the underlying code element", () => {
		const ref = createRef<HTMLElement>();
		render(<Code ref={ref}>npm install</Code>);
		expect(ref.current?.tagName).toBe("CODE");
	});

	test("forwards arbitrary data-* props", () => {
		render(
			<Code data-testid="code" data-analytics-id="install-command">
				npm install
			</Code>,
		);
		expect(screen.getByTestId("code")).toHaveAttribute("data-analytics-id", "install-command");
	});

	test('renders translate="no" so a translation engine skips the code', () => {
		render(<Code data-testid="code">npm install</Code>);
		expect(screen.getByTestId("code")).toHaveAttribute("translate", "no");
	});

	test('keeps translate="no" when a call site passes translate', () => {
		render(
			// @ts-expect-error `translate` is omitted from the props type on purpose. This
			// pins the runtime guard for a caller who spreads a wider props object past it.
			<Code data-testid="code" translate="yes">
				npm install
			</Code>,
		);
		expect(screen.getByTestId("code")).toHaveAttribute("translate", "no");
	});

	test("asChild renders its child, merging classes, data-slot, and the ref onto it", () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<Code asChild className="custom-class">
				<a data-testid="code" href="/api" ref={ref}>
					/api/components.json
				</a>
			</Code>,
		);
		const code = screen.getByTestId("code");
		expect(code.tagName).toBe("A");
		expect(code).toHaveAttribute("data-slot", "code");
		expect(code).toHaveAttribute("translate", "no");
		expect(code.className).toContain("custom-class");
		expect(ref.current).toBe(code);
	});
});

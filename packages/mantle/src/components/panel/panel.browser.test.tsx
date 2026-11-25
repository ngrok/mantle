import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Panel from "./panel-parts.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and the
// contract is the layout the parts' utilities produce.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; margin: 0; }",
		await commands.tailwindCss("./panel.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

describe("Panel layout", () => {
	test("scrolls only the body, so the header and the footer stay at the root's edges", () => {
		render(
			<Panel.Root aria-label="Assistant" style={{ height: 240, width: 320 }}>
				<Panel.Header data-testid="header">Assistant</Panel.Header>
				<Panel.Body data-testid="body">
					<div style={{ height: 2000 }}>conversation</div>
				</Panel.Body>
				<Panel.Footer data-testid="footer">
					<div style={{ height: 40 }}>composer</div>
				</Panel.Footer>
			</Panel.Root>,
		);
		const root = screen.getByRole("complementary", { name: "Assistant" });
		const header = screen.getByTestId("header");
		const body = screen.getByTestId("body");
		const footer = screen.getByTestId("footer");

		const rootBox = root.getBoundingClientRect();
		expect(rootBox.height).toBe(240);
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);

		body.scrollTop = 500;
		expect(body.scrollTop).toBe(500);
		expect(root.scrollTop).toBe(0);
		expect(header.getBoundingClientRect().top).toBe(rootBox.top + 1);
		expect(footer.getBoundingClientRect().bottom).toBe(rootBox.bottom - 1);
	});

	test("shrinks as a flex item, so its body scrolls instead of the panel growing", () => {
		render(
			<div style={{ display: "flex", flexDirection: "column", height: 192 }}>
				<div style={{ height: 32, flexShrink: 0 }} />
				<Panel.Root aria-label="Assistant" style={{ flex: 1 }}>
					<Panel.Body data-testid="body">
						<div style={{ height: 1024 }}>conversation</div>
					</Panel.Body>
					<Panel.Footer>Save</Panel.Footer>
				</Panel.Root>
			</div>,
		);
		expect(screen.getByRole("complementary").getBoundingClientRect().height).toBe(160);
		const body = screen.getByTestId("body");
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
	});

	test("contains an absolute control in its header", () => {
		render(
			<Panel.Root aria-label="Assistant" style={{ margin: 40, width: 160, height: 160 }}>
				<Panel.Header>
					<button type="button" style={{ position: "absolute", top: 0, right: 0 }}>
						Close
					</button>
				</Panel.Header>
			</Panel.Root>,
		);
		const panel = screen.getByRole("complementary").getBoundingClientRect();
		const button = screen.getByRole("button", { name: "Close" }).getBoundingClientRect();
		expect(button.top).toBeGreaterThanOrEqual(panel.top);
		expect(button.right).toBeLessThanOrEqual(panel.right);
	});
});

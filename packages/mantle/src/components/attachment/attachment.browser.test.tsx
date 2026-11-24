import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Attachment from "./attachment-parts.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why preflight: the browser project loads no stylesheet or border-box reset.
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; border: 0 solid; }",
		await commands.tailwindCss("./attachment.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => styleElement.remove());

test.each(["draft", "sent", "reordered"])(
	"keeps the name above the size in a narrow chip (%s)",
	(variant) => {
		render(
			<div style={{ width: 288 }}>
				<Attachment.List aria-label="Attachments" style={{ padding: 0, margin: 0 }}>
					<Attachment.Root>
						{variant !== "reordered" && <Attachment.Preview />}
						<Attachment.Name>{"very-long-filename-".repeat(8)}.pdf</Attachment.Name>
						<Attachment.Size bytes={1843200} />
						{variant === "reordered" && <Attachment.Preview />}
						{variant !== "sent" && <Attachment.Remove label="Remove file" />}
					</Attachment.Root>
				</Attachment.List>
			</div>,
		);
		const root = screen.getByRole("listitem");
		const name = screen.getByText(/very-long-filename/);
		const size = screen.getByText("1.8 MB");
		const nameBox = name.getBoundingClientRect();
		const sizeBox = size.getBoundingClientRect();
		expect(sizeBox.top).toBeGreaterThanOrEqual(nameBox.bottom);
		expect(sizeBox.left).toBe(nameBox.left);
		expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(288);
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
		expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
		const preview = root.querySelector('[data-slot~="attachment-preview"]');
		expect(preview?.getBoundingClientRect().right).toBeLessThan(nameBox.left);
		expect(preview?.getBoundingClientRect().top).toBeLessThan(sizeBox.top);
	},
);

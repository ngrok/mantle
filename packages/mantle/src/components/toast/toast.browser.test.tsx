import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Toast } from "./toast.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this test reads. Inlined so
 * the test stays hermetic and needs no Tailwind build step: a browser test loads
 * no stylesheet, so without this the wrapper would report its initial `display`
 * and the assertion would pass for the wrong reason.
 */
const TOAST_LAYOUT_STYLE = `
@layer utilities {
	.contents { display: contents; }
	.flex { display: flex; }
	.gap-2 { gap: 0.5rem; }
	.flex-1 { flex: 1 1 0%; }
}
`;

describe("Toast.Root label slot (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = TOAST_LAYOUT_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("the label div generates no box, so the message stays a flex child of the root", () => {
		const { container } = render(
			<Toast.Root intent="info">
				<Toast.Icon />
				<Toast.Message>Changes saved</Toast.Message>
			</Toast.Root>,
		);

		const root = container.querySelector('[data-slot="toast"]');
		const label = root?.querySelector('[data-slot="toast-label"]');
		if (root == null || label == null) {
			throw new Error("expected a mounted toast root and its label slot");
		}

		expect(getComputedStyle(label).display).toBe("contents");
		expect(label.getClientRects()).toHaveLength(0);

		// `Toast.Message` carries `flex-1`, which only resolves while the root is
		// its flex container. A wrapper that generated a box would take it out.
		const message = screen.getByText("Changes saved");
		expect(getComputedStyle(message).flexGrow).toBe("1");
		expect(message.getBoundingClientRect().width).toBeGreaterThan(0);
	});
});

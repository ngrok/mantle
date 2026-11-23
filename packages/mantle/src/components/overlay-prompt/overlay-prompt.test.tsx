import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { OverlayPrompt } from "./overlay-prompt.js";

describe("OverlayPrompt", () => {
	test("server-renders its content in place, so the first paint and crawlers have it", () => {
		const html = renderToString(
			<OverlayPrompt>
				<p>We use cookies.</p>
			</OverlayPrompt>,
		);
		const container = document.createElement("div");
		container.innerHTML = html;

		expect(container.querySelector('[data-slot="overlay-prompt"] > p')).toHaveTextContent(
			"We use cookies.",
		);
	});
});

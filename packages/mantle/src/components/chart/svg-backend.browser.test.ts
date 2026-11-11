import { expect, test } from "vitest";
import { createSvgBackend } from "./svg-backend.js";

test("a chart in another realm's document writes its marks", () => {
	// A chart in a same-origin iframe creates its elements from that frame's
	// realm, so they are not instances of this window's `SVGElement`.
	const frame = document.createElement("iframe");
	document.body.append(frame);
	const foreign = frame.contentDocument;
	if (foreign == null) {
		throw new Error("The iframe has no document.");
	}
	const root = foreign.createElement("div");
	foreign.body.append(root);
	// Guards the premise: in one realm this test would pass with the old check.
	expect(foreign.createElementNS("http://www.w3.org/2000/svg", "path")).not.toBeInstanceOf(
		SVGElement,
	);
	const backend = createSvgBackend({
		root,
		plot: root,
		slotName: "bar-chart",
		onEnvironmentChange: () => {},
	});
	const context = backend.begin({ cssWidth: 100, cssHeight: 100, devicePixelRatio: 1 });
	if (context == null) {
		throw new Error("The backend cannot paint.");
	}
	backend.composite(context, {
		underlay: () => {},
		marks: () => {
			context.fillStyle = "red";
			context.fillRect(0, 0, 30, 60);
		},
		fade: null,
	});
	backend.end();
	expect(backend.element.querySelector("path")).toHaveAttribute("d");
	backend.destroy();
	frame.remove();
});

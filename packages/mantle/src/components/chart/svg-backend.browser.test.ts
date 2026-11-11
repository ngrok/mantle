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
		onColorsChange: () => {},
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

test("a right-aligned label ends at its anchor under an RTL ancestor", () => {
	const root = document.createElement("div");
	root.dir = "rtl";
	root.style.cssText = "position: relative; width: 200px; height: 100px;";
	document.body.append(root);
	const backend = createSvgBackend({
		root,
		plot: root,
		slotName: "line-chart",
		onColorsChange: () => {},
	});
	root.prepend(backend.element);
	const context = backend.begin({ cssWidth: 200, cssHeight: 100, devicePixelRatio: 1 });
	if (context == null) {
		throw new Error("The backend cannot paint.");
	}
	backend.composite(context, {
		underlay: () => {},
		marks: () => {
			// A y-axis label: the engine draws it right-aligned, just left of the plot.
			context.font = "12px sans-serif";
			context.textAlign = "right";
			context.fillText("1,000", 60, 50);
		},
		fade: null,
	});
	backend.end();
	const label = backend.element.querySelector("text");
	if (label == null) {
		throw new Error("The backend wrote no label.");
	}
	const anchor = root.getBoundingClientRect().left + 60;
	const box = label.getBoundingClientRect();
	expect(box.width).toBeGreaterThan(0);
	expect(Math.abs(box.right - anchor)).toBeLessThan(2);
	backend.destroy();
	root.remove();
});

import { act, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, CSSProperties } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import { Slider } from "./slider.js";

/**
 * The `hit-area` rule of `mantle.css`, as a class rule. The `tailwindCss`
 * command compiles no `@utility` of `mantle.css`, so the tests read the rule
 * from the source. A change to the rule changes the geometry here.
 */
function hitAreaCss(): string {
	const match = /@utility hit-area \{([\s\S]*?)\n\}/.exec(mantleCss);
	if (match == null) {
		throw new Error("mantle.css holds no hit-area utility.");
	}
	// Why the layer: the compiled classes are in `utilities`, and a rule in no
	// layer wins against them all.
	return `@layer utilities { .hit-area {${match[1]}\n} }`;
}

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		hitAreaCss(),
		await commands.tailwindCss("./slider.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The element that a press receives at an offset from the center of `thumb`. */
function hitFromCenter(thumb: HTMLElement, dx: number, dy: number): Element | null {
	const rect = thumb.getBoundingClientRect();
	return document.elementFromPoint(
		rect.left + rect.width / 2 + dx,
		rect.top + rect.height / 2 + dy,
	);
}

describe("Slider thumb hit area (browser)", () => {
	test("a drag that starts 20px above the thumb moves the thumb", async () => {
		const onValueChange = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={50} max={100} onValueChange={onValueChange} />
			</div>,
		);
		const thumb = screen.getByRole("slider");
		const root = thumb.closest("[data-slot='slider']");
		if (!(root instanceof HTMLElement)) {
			throw new Error("expected the slider root");
		}
		const thumbRect = thumb.getBoundingClientRect();
		const rootRect = root.getBoundingClientRect();

		await userEvent.dragAndDrop(thumb, root, {
			sourcePosition: { x: thumbRect.width / 2, y: thumbRect.height / 2 - 20 },
			targetPosition: { x: rootRect.width * 0.75, y: rootRect.height / 2 },
		});

		expect(onValueChange).toHaveBeenLastCalledWith([75]);
		expect(thumb).toHaveAttribute("aria-valuenow", "75");
	});

	test("--hit-area-size sets the size of the hit area", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider
					aria-label="Volume"
					defaultValue={50}
					style={{ "--hit-area-size": "0px" } as CSSProperties}
				/>
			</div>,
		);
		const thumb = screen.getByRole("slider");

		expect(hitFromCenter(thumb, 0, 0)).toBe(thumb);
		expect(hitFromCenter(thumb, 0, -20)).not.toBe(thumb);
	});

	test("a disabled thumb receives no press", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={50} disabled />
			</div>,
		);
		const thumb = screen.getByRole("slider");

		expect(hitFromCenter(thumb, 0, 0)).not.toBe(thumb);
		expect(hitFromCenter(thumb, 0, -20)).not.toBe(thumb);
	});

	test("with two thumbs near each other, each thumb receives the press on its center and above it", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Range" defaultValue={[40, 50]} max={100} />
			</div>,
		);
		const [lower, upper] = screen.getAllByRole("slider");
		if (lower == null || upper == null) {
			throw new Error("expected two thumbs");
		}

		expect(hitFromCenter(lower, 0, 0)).toBe(lower);
		expect(hitFromCenter(lower, 0, -20)).toBe(lower);
		expect(hitFromCenter(upper, 0, 0)).toBe(upper);
		expect(hitFromCenter(upper, 0, -20)).toBe(upper);
	});
});

/** The thumbs a person sees inside `container`: shown thumbs and placeholders. */
function shownThumbs(container: HTMLElement): Element[] {
	return [...container.querySelectorAll("[data-slot^='slider-thumb']")].filter(
		(element) => getComputedStyle(element).display !== "none",
	);
}

/** An element's box, rounded to the pixel that it paints on. */
function boxOf(element: Element) {
	const { left, top, width, height } = element.getBoundingClientRect();
	return { left: Math.round(left), top: Math.round(top), width, height };
}

describe("Slider server HTML (browser)", () => {
	test.each<{
		name: string;
		props: Pick<ComponentProps<typeof Slider>, "dir" | "inverted" | "orientation">;
	}>([
		{ name: "horizontal", props: {} },
		{ name: "horizontal, inverted", props: { inverted: true } },
		{ name: "horizontal, right to left", props: { dir: "rtl" } },
		{ name: "vertical", props: { orientation: "vertical" } },
		{ name: "vertical, inverted", props: { orientation: "vertical", inverted: true } },
	])(
		"$name: each thumb shows at its value before hydration, where Radix puts it after",
		async ({ props }) => {
			const app = (
				<div style={{ padding: 40, width: 280, height: 200 }}>
					<Slider aria-label="Price" defaultValue={[20, 70]} {...props} />
				</div>
			);
			const container = document.createElement("div");
			container.innerHTML = renderToString(app);
			document.body.append(container);

			const serverBoxes = shownThumbs(container).map(boxOf);
			const root = await act(() => hydrateRoot(container, app));
			await waitFor(() => {
				expect(container.querySelector("[role='slider']")).toHaveAttribute("aria-valuenow", "20");
			});
			const hydratedThumbs = shownThumbs(container);
			const hydratedRoles = hydratedThumbs.map((thumb) => thumb.getAttribute("role"));
			const hydratedBoxes = hydratedThumbs.map(boxOf);
			act(() => root.unmount());
			container.remove();

			expect(serverBoxes).toHaveLength(2);
			expect(hydratedRoles).toEqual(["slider", "slider"]);
			expect(serverBoxes).toEqual(hydratedBoxes);
		},
	);
});

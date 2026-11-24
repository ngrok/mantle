import { act, render, screen } from "@testing-library/react";
import { userEvent as testingLibraryUserEvent } from "@testing-library/user-event";
import type { ComponentProps, CSSProperties } from "react";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from "vitest";
import { cdp, commands, userEvent, server } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import { Slider, SliderValue } from "./slider.js";

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

/** Sends one trusted mouse event at a viewport point, in the page that CDP input addresses. Chromium only. */
function mouse(type: "mousePressed" | "mouseMoved" | "mouseReleased", x: number, y: number) {
	const frame = window.frameElement?.getBoundingClientRect();
	const scale = frame == null ? 1 : frame.width / window.innerWidth;
	return cdp().send("Input.dispatchMouseEvent", {
		type,
		x: (frame?.left ?? 0) + x * scale,
		y: (frame?.top ?? 0) + y * scale,
		button: "left",
		buttons: type === "mouseReleased" ? 0 : 1,
		clickCount: 1,
	});
}

/** The thumb that a press reaches at an offset from the center of `thumb`, through the thumb or its input. */
function hitFromCenter(thumb: Element, dx: number, dy: number): Element | null {
	const rect = thumb.getBoundingClientRect();
	const hit = document.elementFromPoint(
		rect.left + rect.width / 2 + dx,
		rect.top + rect.height / 2 + dy,
	);
	return hit?.closest("[data-slot='slider-thumb']") ?? null;
}

/** The visible thumb that holds the range input `input`. */
function thumbOf(input: HTMLElement | undefined): Element {
	const thumb = input?.closest("[data-slot='slider-thumb']");
	if (thumb == null) {
		throw new Error("expected a slider thumb");
	}
	return thumb;
}

function rootOf(element: Element): HTMLElement {
	const root = element.closest("[data-slot='slider']");
	if (!(root instanceof HTMLElement)) {
		throw new Error("expected the slider root");
	}
	return root;
}

/** The values of each thumb, as numbers. */
function thumbValues(): number[] {
	return screen
		.getAllByRole("slider")
		.map((input) => (input instanceof HTMLInputElement ? input.valueAsNumber : Number.NaN));
}

test("a test finds each thumb by role and uses it as a native range input, with no force", async () => {
	const onValueChange = vi.fn<(value: number[]) => void>();
	render(
		<form data-testid="form" style={{ padding: 40, width: 280 }}>
			<Slider aria-label="Volume" defaultValue={50} name="volume" onValueChange={onValueChange} />
		</form>,
	);
	const slider = screen.getByRole("slider", { name: "Volume" });
	if (!(slider instanceof HTMLInputElement)) {
		throw new Error("expected a range input");
	}

	// Why both: Testing Library refuses an element with `pointer-events: none`, and
	// Playwright refuses one that another element covers. Why not in Firefox: its
	// synthetic press has pointer id 1, and Firefox rejects `setPointerCapture`
	// for an id no real pointer has (reported to the Slider owners).
	if (server.browser !== "firefox") {
		await testingLibraryUserEvent.setup().click(slider);
	}
	await userEvent.hover(slider);
	await userEvent.click(slider);
	expect(slider).toHaveFocus();
	expect(onValueChange).not.toHaveBeenCalled();

	await userEvent.fill(slider, "70");
	expect(onValueChange).toHaveBeenLastCalledWith([70]);
	expect(getComputedStyle(thumbOf(slider)).getPropertyValue("--_value")).toBe("70");

	await userEvent.keyboard("{ArrowRight}");
	expect(slider).toHaveValue("71");

	const form = screen.getByTestId("form");
	expect(form instanceof HTMLFormElement && new FormData(form).get("volume")).toBe(slider.value);
});

// Why not in WebKit: Playwright's `dragAndDrop` there leaves a range input at 0.
// A real mouse drag in WebKit moves the thumb as in the other engines.
test.skipIf(server.browser === "webkit")(
	"a drag on a thumb moves it and submits the new value",
	async () => {
		render(
			<form data-testid="form" style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={71} name="volume" />
			</form>,
		);
		const slider = screen.getByRole("slider", { name: "Volume" });
		if (!(slider instanceof HTMLInputElement)) {
			throw new Error("expected a range input");
		}
		await userEvent.dragAndDrop(slider, rootOf(slider), {
			targetPosition: {
				x: rootOf(slider).getBoundingClientRect().width * 0.25,
				y: rootOf(slider).getBoundingClientRect().height / 2,
			},
		});
		// Why close to 25: a press on a thumb grabs it where it is, so the thumb keeps its offset to the pointer.
		expect(Number(slider.value)).toBeCloseTo(25, -1);
		const form = screen.getByTestId("form");
		expect(form instanceof HTMLFormElement && new FormData(form).get("volume")).toBe(slider.value);
	},
);

describe("Slider thumb hit area (browser)", () => {
	test("a drag that starts 20px above the thumb moves the thumb", async () => {
		const onValueChange = vi.fn<(value: number[]) => void>();
		const onValueCommit = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider
					aria-label="Volume"
					defaultValue={50}
					max={100}
					onValueChange={onValueChange}
					onValueCommit={onValueCommit}
				/>
			</div>,
		);
		const input = screen.getByRole("slider");
		const thumb = thumbOf(input);
		const root = rootOf(thumb);
		const thumbRect = thumb.getBoundingClientRect();
		const rootRect = root.getBoundingClientRect();

		await userEvent.dragAndDrop(thumb, root, {
			sourcePosition: { x: thumbRect.width / 2, y: thumbRect.height / 2 - 20 },
			targetPosition: { x: rootRect.width * 0.75, y: rootRect.height / 2 },
		});

		expect(onValueChange).toHaveBeenLastCalledWith([75]);
		expect(onValueCommit).toHaveBeenCalledExactlyOnceWith([75]);
		expect(input).toHaveValue("75");
		expect(input).toHaveFocus();
	});

	test("a press beside the center of a thumb grabs the thumb where it is", async () => {
		const onValueChange = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={50} onValueChange={onValueChange} />
			</div>,
		);
		const thumb = thumbOf(screen.getByRole("slider"));
		const at = { x: thumb.getBoundingClientRect().width / 2 + 8, y: 9 };

		await userEvent.dragAndDrop(thumb, thumb, { sourcePosition: at, targetPosition: at });

		expect(onValueChange).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("slider")).toHaveFocus();
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
		const thumb = thumbOf(screen.getByRole("slider"));

		expect(hitFromCenter(thumb, 0, 0)).toBe(thumb);
		expect(hitFromCenter(thumb, 0, -20)).not.toBe(thumb);
	});

	test("a disabled thumb receives no press", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={50} disabled />
			</div>,
		);
		const thumb = thumbOf(screen.getByRole("slider"));

		expect(hitFromCenter(thumb, 0, 0)).not.toBe(thumb);
		expect(hitFromCenter(thumb, 0, -20)).not.toBe(thumb);
	});

	test("with two thumbs near each other, each thumb receives the press on its center and above it", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Range" defaultValue={[40, 50]} max={100} />
			</div>,
		);
		const [lower, upper] = screen.getAllByRole("slider").map(thumbOf);
		if (lower == null || upper == null) {
			throw new Error("expected two thumbs");
		}

		expect(hitFromCenter(lower, 0, 0)).toBe(lower);
		expect(hitFromCenter(lower, 0, -20)).toBe(lower);
		expect(hitFromCenter(upper, 0, 0)).toBe(upper);
		expect(hitFromCenter(upper, 0, -20)).toBe(upper);
	});
});

describe("Slider track press (browser)", () => {
	/** The running transitions of the thumb's and the range's position. */
	function glides(): { property: string; duration: unknown; easing: string }[] {
		return document
			.getAnimations()
			.filter((animation) => animation instanceof CSSTransition)
			.filter((transition) => /inset|left|right|top|bottom/.test(transition.transitionProperty))
			.map((transition) => ({
				property: transition.transitionProperty,
				duration: transition.effect?.getTiming().duration,
				easing: transition.effect?.getTiming().easing ?? "",
			}));
	}

	function renderSlider() {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Level" defaultValue={0} />
			</div>,
		);
		const slider = screen.getByRole("slider");
		return { slider, root: rootOf(slider) };
	}

	test("a press 10px beside the thin track still moves the thumb", async () => {
		const { slider, root } = renderSlider();
		const rect = root.getBoundingClientRect();

		await userEvent.click(root, { position: { x: rect.width * 0.75, y: rect.height / 2 - 10 } });

		expect(Number((slider as HTMLInputElement).value)).toBeGreaterThan(60);
	});

	test("a press on the track glides the thumb and the range on ease-out-strong in 200ms", async () => {
		const { slider, root } = renderSlider();
		const rect = root.getBoundingClientRect();

		await userEvent.click(root, { position: { x: rect.width - 1, y: rect.height / 2 } });

		expect(slider).toHaveValue("100");
		const curve = "cubic-bezier(0.23, 1, 0.32, 1)";
		expect(glides()).toEqual(
			expect.arrayContaining([
				{ property: "left", duration: 200, easing: curve },
				{ property: "right", duration: 200, easing: curve },
			]),
		);
	});

	test("a move of the pointer that changes no value keeps the thumb and the range gliding together", async () => {
		const { root } = renderSlider();
		const rect = root.getBoundingClientRect();
		const at = { x: rect.width * 0.8, y: rect.height / 2 };

		await userEvent.dragAndDrop(root, root, {
			sourcePosition: at,
			targetPosition: { ...at, y: at.y + 1 },
		});

		expect(glides().map(({ property }) => property)).toEqual(
			expect.arrayContaining(["left", "right"]),
		);
	});

	test("a reset during a glide moves the thumb at once", async () => {
		render(
			<form style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Level" defaultValue={0} />
				<button type="reset" style={{ marginTop: 40 }}>
					Reset
				</button>
			</form>,
		);
		const slider = screen.getByRole("slider");
		const root = rootOf(slider);
		const rect = root.getBoundingClientRect();
		const reset = screen.getByRole("button", { name: "Reset" });

		await userEvent.click(root, { position: { x: rect.width - 1, y: rect.height / 2 } });
		reset.click();

		await expect
			.poll(() => getComputedStyle(thumbOf(slider)).getPropertyValue("--_value"))
			.toBe("0");
		expect(root).not.toHaveAttribute("data-track-press");
		expect(glides()).toEqual([]);
	});

	// Why Chromium only: the test sends trusted mouse input through CDP.
	test.runIf(server.browser === "chromium")(
		"a thumb grabbed during its glide follows the pointer from where it shows",
		async () => {
			const { slider, root } = renderSlider();
			const rect = root.getBoundingClientRect();
			const thumb = thumbOf(slider);

			// Why fake timers: the glide ends on a 250ms timer. On a slow runner it can end
			// before the grab, and the grab then keeps an offset.
			vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
			onTestFinished(() => {
				vi.useRealTimers();
			});

			const y = rect.top + rect.height / 2;
			await mouse("mousePressed", rect.right - 1, y);
			await mouse("mouseReleased", rect.right - 1, y);
			// Why pause the glide at 50ms: a glide that moves on after the read lets the press
			// land on the track, and a glide near its start puts the move off the track.
			for (const animation of document.getAnimations()) {
				animation.pause();
				animation.currentTime = 50;
			}
			const shown = thumb.getBoundingClientRect();
			const x = shown.left + shown.width / 2;
			await mouse("mousePressed", x, y);
			// Why: a press on the thumb keeps its value. A press on the track moves it.
			expect(thumbValues()).toEqual([100]);
			await mouse("mouseMoved", x - 20, y);
			await mouse("mouseReleased", x - 20, y);

			// Why these limits: the value snaps to a step. The thumb's center travels half a
			// thumb short of each end of the track, and the snap adds half a step (1px). A
			// grab that kept the offset from the value, not from where the thumb shows, ends near 90.
			const value = ((x - 20 - rect.left) / rect.width) * 100;
			expect(Math.abs((thumbValues()[0] ?? Number.NaN) - value)).toBeLessThanOrEqual(1);
			const ended = thumb.getBoundingClientRect();
			expect(Math.abs(ended.left + ended.width / 2 - (x - 20))).toBeLessThanOrEqual(
				ended.width / 2 + 1,
			);
		},
	);

	test("the hit area of the next slider leaves this slider's thumb clickable", async () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Treble" defaultValue={50} />
				<Slider aria-label="Bass" defaultValue={50} disabled />
			</div>,
		);
		const treble = screen.getByRole("slider", { name: "Treble" });

		await userEvent.click(treble);

		expect(treble).toHaveFocus();
	});

	test("a key press and a drag move the thumb at once", async () => {
		const { slider, root } = renderSlider();
		const rect = root.getBoundingClientRect();
		slider.focus();
		await userEvent.keyboard("{PageUp}");
		expect(glides()).toEqual([]);

		await userEvent.dragAndDrop(root, root, {
			sourcePosition: { x: rect.width * 0.25, y: rect.height / 2 },
			targetPosition: { x: rect.width * 0.75, y: rect.height / 2 },
		});

		expect(Number((slider as HTMLInputElement).value)).toBeGreaterThan(60);
		expect(glides()).toEqual([]);
	});

	test("with reduced motion, a press on the track moves the thumb at once", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		try {
			const { slider, root } = renderSlider();
			const rect = root.getBoundingClientRect();

			await userEvent.click(root, { position: { x: rect.width - 1, y: rect.height / 2 } });

			expect(slider).toHaveValue("100");
			expect(glides()).toEqual([]);
		} finally {
			await commands.emulateMedia({ reducedMotion: "no-preference" });
		}
	});
});

describe("Slider pointer (browser)", () => {
	/** Presses the track of the only slider at `fraction` of its length from the top left, and drags to `to`. */
	async function pressTrack(fraction: number, to = fraction) {
		const root = rootOf(screen.getAllByRole("slider")[0] ?? document.body);
		const rect = root.getBoundingClientRect();
		const vertical = root.dataset.orientation === "vertical";
		const at = (f: number) =>
			vertical
				? { x: rect.width / 2, y: rect.height * f }
				: { x: rect.width * f, y: rect.height / 2 };
		await userEvent.dragAndDrop(root, root, {
			sourcePosition: at(fraction),
			targetPosition: at(to),
		});
	}

	test.each<{
		name: string;
		props: Pick<ComponentProps<typeof Slider>, "inverted" | "orientation">;
		dir?: "rtl";
		expected: number;
	}>([
		{ name: "horizontal", props: {}, expected: 25 },
		{ name: "inverted", props: { inverted: true }, expected: 75 },
		{ name: "inherited right to left", props: {}, dir: "rtl", expected: 75 },
		{ name: "vertical", props: { orientation: "vertical" }, expected: 75 },
		{
			name: "vertical, inverted",
			props: { orientation: "vertical", inverted: true },
			expected: 25,
		},
	])(
		"$name: a press on the track moves the thumb under the pointer",
		async ({ props, dir, expected }) => {
			render(
				<div dir={dir} style={{ padding: 40, width: 280, height: 200 }}>
					<Slider aria-label="Level" defaultValue={50} {...props} />
				</div>,
			);

			await pressTrack(0.25);

			expect(thumbValues()).toEqual([expected]);
		},
	);

	test("a press on the track moves the nearest thumb, and a drag past the other thumb swaps them", async () => {
		const onValueCommit = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Price" defaultValue={[30, 60]} onValueCommit={onValueCommit} />
			</div>,
		);

		await pressTrack(0.2, 0.9);

		expect(thumbValues()).toEqual([60, 90]);
		expect(screen.getByRole("slider", { name: "Maximum Price" })).toHaveFocus();
		expect(onValueCommit).toHaveBeenCalledExactlyOnceWith([60, 90]);
	});

	test("with preserveThumbOrder, a drag stops one step short of the other thumb", async () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Price" defaultValue={[30, 60]} preserveThumbOrder />
			</div>,
		);

		await pressTrack(0.2, 0.9);

		expect(thumbValues()).toEqual([59, 60]);
	});

	test("a slider in a disabled fieldset ignores a press on the track", async () => {
		const onValueChange = vi.fn<(value: number[]) => void>();
		render(
			<fieldset disabled style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Level" defaultValue={50} onValueChange={onValueChange} />
			</fieldset>,
		);

		await pressTrack(0.25);

		expect(onValueChange).toHaveBeenCalledTimes(0);
		expect(thumbValues()).toEqual([50]);
	});

	test("a disabled slider ignores a press on the track", async () => {
		const onValueChange = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Level" defaultValue={50} disabled onValueChange={onValueChange} />
			</div>,
		);

		await pressTrack(0.25);

		expect(onValueChange).toHaveBeenCalledTimes(0);
		expect(thumbValues()).toEqual([50]);
	});
});

test("a value at a max off the step grid reads out and submits as shown", async () => {
	render(
		<form data-testid="form">
			<Slider aria-label="Volume" defaultValue={9} max={11} name="volume" step={3} />
		</form>,
	);
	const form = screen.getByTestId("form");
	if (!(form instanceof HTMLFormElement)) {
		throw new Error("expected a form");
	}
	screen.getByRole("slider").focus();
	await userEvent.keyboard("{End}");

	expect(screen.getByRole("slider")).toHaveValue("11");
	expect(new FormData(form).get("volume")).toBe("11");
});

test("a click on a reset button returns the thumbs and the inputs to defaultValue", async () => {
	const onValueChange = vi.fn<(value: number[]) => void>();
	render(
		<form style={{ padding: 40, width: 280 }}>
			<Slider aria-label="Price" defaultValue={[20, 80]} onValueChange={onValueChange} />
			<button type="reset">Reset</button>
		</form>,
	);
	const [lower] = screen.getAllByRole("slider");
	lower?.focus();
	await userEvent.keyboard("{PageUp}");
	expect(thumbValues()).toEqual([30, 80]);
	const thumb = thumbOf(lower);
	const moved = thumb.getBoundingClientRect().left;

	await userEvent.click(screen.getByRole("button", { name: "Reset" }));

	await expect.poll(() => onValueChange.mock.lastCall).toEqual([[20, 80]]);
	expect(thumbValues()).toEqual([20, 80]);
	expect(thumb.getBoundingClientRect().left).toBeLessThan(moved);
});

test("a reset returns an off-grid defaultValue after a key press moved the thumb onto the grid", async () => {
	render(
		<form data-testid="form">
			<Slider aria-label="Volume" defaultValue={100} max={100} name="volume" step={30} />
			<button type="reset">Reset</button>
		</form>,
	);
	screen.getByRole("slider").focus();
	await userEvent.keyboard("{ArrowLeft}");
	expect(screen.getByRole("slider")).toHaveValue("90");

	await userEvent.click(screen.getByRole("button", { name: "Reset" }));

	await expect.poll(() => thumbValues()).toEqual([100]);
	expect(screen.getByRole("slider")).toHaveValue("100");
	screen.getByRole("slider").focus();
	await userEvent.keyboard("{ArrowLeft}");
	expect(screen.getByRole("slider")).toHaveValue("90");
});

// Why Chromium only: the fingers come from CDP touch events, which only Chromium has.
test.runIf(server.browser === "chromium")(
	"a second finger neither moves nor ends the drag of the first",
	async () => {
		const onValueCommit = vi.fn<(value: number[]) => void>();
		render(
			<div style={{ padding: "20px 50px", width: 400 }}>
				<Slider aria-label="Volume" defaultValue={50} onValueCommit={onValueCommit} />
			</div>,
		);
		const root = rootOf(screen.getByRole("slider"));
		const rect = root.getBoundingClientRect();
		/** A touch point at `percent` of the track, for the finger `id`, in the page that CDP input addresses. */
		const at = (id: number, percent: number) => {
			const frame = window.frameElement?.getBoundingClientRect();
			const scale = frame == null ? 1 : frame.width / window.innerWidth;
			const x = rect.left + (rect.width * percent) / 100;
			const y = rect.top + rect.height / 2;
			return { id, x: (frame?.left ?? 0) + x * scale, y: (frame?.top ?? 0) + y * scale };
		};
		const touch = (
			type: "touchStart" | "touchMove" | "touchEnd",
			touchPoints: { id: number; x: number; y: number }[],
		) => cdp().send("Input.dispatchTouchEvent", { type, touchPoints });

		await touch("touchStart", [at(1, 50)]);
		await touch("touchMove", [at(1, 30)]);
		await touch("touchStart", [at(1, 30), at(2, 80)]);
		await touch("touchMove", [at(1, 30), at(2, 70)]);
		await expect.poll(() => thumbValues()).toEqual([30]);
		// Why a move without finger 2: CDP lifts each finger that a move leaves out.
		await touch("touchMove", [at(1, 30)]);
		await touch("touchMove", [at(1, 20)]);
		await expect.poll(() => thumbValues()).toEqual([20]);
		expect(onValueCommit).not.toHaveBeenCalled();
		await touch("touchEnd", []);

		await expect.poll(() => onValueCommit.mock.calls).toEqual([[[20]]]);
	},
);

// Why not in WebKit: it matches the forced-colors query but forces no colors.
test.skipIf(server.browser === "webkit")(
	"in forced-colors mode, a focused thumb shows an outline",
	async () => {
		await commands.emulateMedia({ forcedColors: "active" });
		try {
			render(<Slider aria-label="Volume" defaultValue={50} />);
			await userEvent.keyboard("{Tab}");
			const thumb = thumbOf(screen.getByRole("slider"));

			expect(getComputedStyle(thumb).outlineStyle).toBe("solid");
			expect(getComputedStyle(thumb).outlineColor).not.toBe("rgba(0, 0, 0, 0)");
		} finally {
			await commands.emulateMedia({ forcedColors: "none" });
		}
	},
);

test("a vertical thumb is a vertical range input, which Chromium reports as a vertical slider", () => {
	render(<Slider aria-label="Height" defaultValue={30} orientation="vertical" />);

	expect(getComputedStyle(screen.getByRole("slider")).writingMode).toBe("vertical-lr");
});

/** The thumbs a person sees inside `container`. */
function shownThumbs(container: HTMLElement): Element[] {
	return [...container.querySelectorAll("[data-slot='slider-thumb']")].filter(
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
		start: (thumb: DOMRect, root: DOMRect) => number;
	}>([
		{ name: "horizontal", props: {}, start: (thumb, root) => thumb.left - root.left },
		{
			name: "horizontal, inverted",
			props: { inverted: true },
			start: (thumb, root) => root.right - thumb.right,
		},
		{
			name: "horizontal, right to left",
			props: { dir: "rtl" },
			start: (thumb, root) => root.right - thumb.right,
		},
		{
			name: "vertical",
			props: { orientation: "vertical" },
			start: (thumb, root) => root.bottom - thumb.bottom,
		},
		{
			name: "vertical, inverted",
			props: { orientation: "vertical", inverted: true },
			start: (thumb, root) => thumb.top - root.top,
		},
	])(
		"$name: each thumb shows at its value before hydration, and stays there after",
		async ({ props, start }) => {
			const app = (
				<div style={{ padding: 40, width: 280, height: 200 }}>
					<Slider aria-label="Price" defaultValue={[20, 70]} {...props} />
				</div>
			);
			const container = document.createElement("div");
			container.innerHTML = renderToString(app);
			document.body.append(container);

			const serverThumbs = shownThumbs(container);
			const rootRect = rootOf(serverThumbs[0] ?? container).getBoundingClientRect();
			const length = props.orientation === "vertical" ? rootRect.height : rootRect.width;
			const serverStarts = serverThumbs.map((thumb) =>
				Math.round(start(thumb.getBoundingClientRect(), rootRect)),
			);
			const serverSliders = [...container.querySelectorAll("input[type='range']")].map(
				(input) => input instanceof HTMLInputElement && input.valueAsNumber,
			);
			const serverBoxes = serverThumbs.map(boxOf);
			const root = await act(() => hydrateRoot(container, app));
			const hydratedBoxes = shownThumbs(container).map(boxOf);
			act(() => root.unmount());
			container.remove();

			// Why the track length less one thumb: the thumb stays inside the track.
			const travel = length - 18;
			expect(serverStarts).toEqual([Math.round(travel * 0.2), Math.round(travel * 0.7)]);
			expect(serverSliders).toEqual([20, 70]);
			expect(hydratedBoxes).toEqual(serverBoxes);
		},
	);
});

describe("SliderValue (browser)", () => {
	/** The value labels on the page, in DOM order. */
	function labels(): HTMLElement[] {
		return [...document.querySelectorAll<HTMLElement>("[data-slot='slider-value']")];
	}

	/** Shows the value labels of `root` as a drag does, which CSS alone decides. */
	function showLabels(root: HTMLElement) {
		root.setAttribute("data-dragging", "");
	}

	/** The horizontal center of an element. */
	const centerX = (element: Element) => {
		const { left, width } = element.getBoundingClientRect();
		return left + width / 2;
	};

	test("a slider with no value label renders none and is no size container", () => {
		render(<Slider aria-label="Volume" defaultValue={50} />);

		expect(labels()).toEqual([]);
		expect(getComputedStyle(rootOf(screen.getByRole("slider"))).containerType).toBe("normal");
	});

	test("at rest and under keyboard focus, the label is hidden and out of the accessibility tree", async () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Volume" defaultValue={40} formatValue={(value) => `${value}%`}>
					<SliderValue />
				</Slider>
			</div>,
		);
		const [label] = labels();
		screen.getByRole("slider").focus();
		await userEvent.keyboard("{ArrowRight}");

		expect(label).toHaveTextContent("41%");
		expect(getComputedStyle(label ?? document.body).opacity).toBe("0");
		expect(label).toHaveAttribute("aria-hidden", "true");
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "41%");
	});

	test.each([
		{ name: "left to right", dir: undefined },
		{ name: "right to left", dir: "rtl" as const },
	])(
		"$name: a label at each thumb centers on it, and stays inside the slider at each end",
		({ dir }) => {
			render(
				<div dir={dir} style={{ padding: 40, width: 280 }}>
					<Slider
						aria-label="Price"
						defaultValue={[0, 50, 100]}
						formatValue={(value) => `$${value}.00`}
					>
						<SliderValue />
					</Slider>
				</div>,
			);
			const root = rootOf(screen.getAllByRole("slider")[0] ?? document.body);
			showLabels(root);
			const [low, middle, high] = labels();
			const thumbs = screen.getAllByRole("slider").map(thumbOf);
			const rootRect = root.getBoundingClientRect();

			expect(labels().map((label) => label.textContent)).toEqual(["$0.00", "$50.00", "$100.00"]);
			expect(Math.abs(centerX(middle ?? root) - centerX(thumbs[1] ?? root))).toBeLessThan(1);
			for (const label of [low, high]) {
				const box = (label ?? root).getBoundingClientRect();
				expect(box.left).toBeGreaterThanOrEqual(rootRect.left - 0.5);
				expect(box.right).toBeLessThanOrEqual(rootRect.right + 0.5);
			}
			for (const [index, label] of labels().entries()) {
				expect(label.getBoundingClientRect().bottom).toBeLessThan(
					(thumbs[index] ?? root).getBoundingClientRect().top,
				);
			}
		},
	);

	test("in a vertical slider, a label at the thumb sits beside it, centered on it", () => {
		render(
			<div style={{ padding: 60, height: 200 }}>
				<Slider aria-label="Level" defaultValue={30} orientation="vertical">
					<SliderValue />
				</Slider>
			</div>,
		);
		const thumb = thumbOf(screen.getByRole("slider"));
		showLabels(rootOf(thumb));
		const [label] = labels();
		const box = (label ?? thumb).getBoundingClientRect();
		const thumbBox = thumb.getBoundingClientRect();

		expect(box.right).toBeLessThan(thumbBox.left);
		expect(Math.abs(box.top + box.height / 2 - (thumbBox.top + thumbBox.height / 2))).toBeLessThan(
			1,
		);
	});

	test("a label above the track shows every value of a range, centered on the track", () => {
		render(
			<div style={{ padding: 40, width: 280 }}>
				<Slider aria-label="Price" defaultValue={[20, 80]}>
					<SliderValue placement="track" />
				</Slider>
			</div>,
		);
		const root = rootOf(screen.getAllByRole("slider")[0] ?? document.body);
		showLabels(root);
		const [label, ...others] = labels();

		expect(others).toEqual([]);
		expect(label).toHaveTextContent("20 – 80");
		expect(Math.abs(centerX(label ?? root) - centerX(root))).toBeLessThan(1);
		const thumbTop = Math.min(
			...screen.getAllByRole("slider").map((input) => thumbOf(input).getBoundingClientRect().top),
		);
		expect((label ?? root).getBoundingClientRect().bottom).toBeLessThan(thumbTop);
	});

	test("with reduced motion, the label shows and hides at once", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		try {
			render(
				<Slider aria-label="Volume" defaultValue={40}>
					<SliderValue />
				</Slider>,
			);
			const [label] = labels();

			expect(getComputedStyle(label ?? document.body).transitionDuration).toBe("0s");
		} finally {
			await commands.emulateMedia({ reducedMotion: "no-preference" });
		}
	});

	test("a label above the track follows a controlled slider that adds a thumb", () => {
		const { rerender } = render(
			<Slider aria-label="Price" value={[50]} onValueChange={() => {}}>
				<SliderValue placement="track" />
			</Slider>,
		);
		rerender(
			<Slider aria-label="Price" value={[50, 80]} onValueChange={() => {}}>
				<SliderValue placement="track" />
			</Slider>,
		);

		return expect.poll(() => labels().at(-1)?.textContent).toBe("50 – 80");
	});

	test("a label wrapped in another element still reads its value, and a child of false is no label", () => {
		const show = false;
		render(
			<>
				<Slider aria-label="Volume" defaultValue={40}>
					<span>
						<SliderValue placement="track" />
					</span>
				</Slider>
				<Slider aria-label="Treble" defaultValue={40}>
					{show && <SliderValue />}
				</Slider>
			</>,
		);

		expect(labels().map((label) => label.textContent)).toEqual(["40"]);
		expect(
			getComputedStyle(rootOf(screen.getByRole("slider", { name: "Treble" }))).containerType,
		).toBe("normal");
	});

	// Why Chromium only: the test holds the mouse button down through CDP.
	test.runIf(server.browser === "chromium")(
		"a controlled slider's label matches the value after each move, and after a change from outside on a press",
		async () => {
			function Controlled() {
				const [value, setValue] = useState(40);
				return (
					<div style={{ padding: 40, width: 280 }}>
						<button type="button" onClick={() => setValue(75)}>
							Set 75
						</button>
						<Slider
							aria-label="Volume"
							value={value}
							onValueChange={([next]) => setValue(Math.min(next ?? 0, 90))}
						>
							<SliderValue />
						</Slider>
					</div>
				);
			}
			render(<Controlled />);
			const slider = screen.getByRole("slider");
			const thumb = thumbOf(slider);
			const [label] = labels();
			const root = rootOf(thumb);
			const rect = root.getBoundingClientRect();
			const y = rect.top + rect.height / 2;

			await mouse("mousePressed", centerX(thumb), y);
			for (const fraction of [0.55, 0.7, 0.95]) {
				await mouse("mouseMoved", rect.left + rect.width * fraction, y);
				await expect.poll(() => label?.textContent).toBe((slider as HTMLInputElement).value);
			}
			expect(slider).toHaveValue("90");
			await mouse("mouseReleased", rect.left + rect.width * 0.95, y);

			screen.getByRole("button", { name: "Set 75" }).click();
			await expect.poll(() => (slider as HTMLInputElement).value).toBe("75");
			await mouse("mousePressed", centerX(thumb), y);
			await expect.poll(() => label?.textContent).toBe("75");
			await mouse("mouseReleased", centerX(thumb), y);
		},
	);

	// Why Chromium only: the test holds the mouse button down through CDP.
	test.runIf(server.browser === "chromium")(
		"while a pointer drags a thumb, its label shows and follows the value",
		async () => {
			render(
				<div style={{ padding: 40, width: 280 }}>
					<Slider aria-label="Volume" defaultValue={40} formatValue={(value) => `${value}%`}>
						<SliderValue />
					</Slider>
				</div>,
			);
			const slider = screen.getByRole("slider");
			const thumb = thumbOf(slider);
			const root = rootOf(thumb);
			const [label] = labels();
			const y = thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2;
			const x = centerX(thumb);
			const rootRect = root.getBoundingClientRect();

			await mouse("mousePressed", x, y);
			await mouse("mouseMoved", rootRect.left + rootRect.width * 0.75, y);
			await expect.poll(() => getComputedStyle(label ?? root).opacity).toBe("1");
			const value = Number((slider as HTMLInputElement).value);
			expect(label).toHaveTextContent(`${value}%`);
			expect(slider).toHaveAttribute("aria-valuetext", `${value}%`);
			expect(Math.abs(centerX(label ?? root) - centerX(thumb))).toBeLessThan(1);
			await mouse("mouseReleased", rootRect.left + rootRect.width * 0.75, y);

			expect(root).not.toHaveAttribute("data-dragging");
			await expect.poll(() => getComputedStyle(label ?? root).opacity).toBe("0");
		},
	);
});

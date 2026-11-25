import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import * as SegmentedControl from "./segmented-control-parts.js";

/** The item of the radio named `name`, the element a user's click on the item hits. */
function item(name: string): HTMLElement {
	const element = screen.getByRole("radio", { name }).parentElement;
	if (element == null) {
		throw new Error(`The radio "${name}" has no item.`);
	}
	return element;
}

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. Without the
// component's real utilities, the items do not lay out in a row.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		await commands.tailwindCss("./segmented-control.tsx"),
		await commands.tailwindCss("../radio-group/primitive.tsx"),
		await commands.tailwindCss("../button/icon-button-variants.ts"),
		await commands.tailwindCss("../button/button.tsx"),
		await commands.tailwindCss("./segmented-control.browser.test.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

describe("SegmentedControl.Item", () => {
	test("a long label stays on one line inside its item", () => {
		render(
			<div style={{ width: 240, font: "14px/20px sans-serif" }}>
				<SegmentedControl.Root aria-label="Window" defaultValue="hour">
					<SegmentedControl.Item value="hour">1h</SegmentedControl.Item>
					<SegmentedControl.Item value="week">
						Requests per second over the last week
					</SegmentedControl.Item>
				</SegmentedControl.Root>
			</div>,
		);

		const item = screen.getByRole("radio", { name: /last week/ }).parentElement;
		if (item == null) {
			throw new Error("The radio has no item label.");
		}
		expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight);
		expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
	});
});

describe("SegmentedControl size", () => {
	test("xs items with one-character labels keep their targets 24px apart", () => {
		render(
			<SegmentedControl.Root
				aria-label="Decimal separator"
				defaultValue="point"
				size="xs"
				className="w-fit"
			>
				<SegmentedControl.Item value="point" aria-label="Point">
					.
				</SegmentedControl.Item>
				<SegmentedControl.Item value="comma" aria-label="Comma">
					,
				</SegmentedControl.Item>
			</SegmentedControl.Root>,
		);

		const point = item("Point").getBoundingClientRect();
		const comma = item("Comma").getBoundingClientRect();
		expect(comma.left + comma.width / 2 - (point.left + point.width / 2)).toBeGreaterThanOrEqual(
			24,
		);
	});

	test("an icon-only item is square, and an item with a visible label keeps the button padding", () => {
		render(
			<div style={{ display: "flex", alignItems: "center" }}>
				<SegmentedControl.Root aria-label="Layout" defaultValue="list" className="w-fit">
					<SegmentedControl.Item value="list">
						<svg aria-hidden width={20} height={20} />
						<span className="sr-only">List</span>
					</SegmentedControl.Item>
					<SegmentedControl.Item value="grid">
						<svg aria-hidden width={20} height={20} />
						<span>Grid</span>
					</SegmentedControl.Item>
				</SegmentedControl.Root>
				<IconButton appearance="ghost" intent="neutral" size="sm" label="Copy" icon={<svg />} />
			</div>,
		);

		const list = item("List").getBoundingClientRect();
		const button = screen.getByRole("button", { name: "Copy" }).getBoundingClientRect();
		expect([list.width, list.height]).toEqual([button.width, button.height]);
		expect(getComputedStyle(item("Grid")).paddingInlineStart).toBe("12px");
	});

	test.each(["xs", "sm", "md", "lg", "xl"] as const)(
		"a %s control matches the height of an IconButton and the padding of a Button, and its labels have room",
		(size) => {
			render(
				<div style={{ display: "flex", alignItems: "center" }}>
					<SegmentedControl.Root aria-label="View" defaultValue="headers" size={size}>
						<SegmentedControl.Item value="headers">
							<span>Headers</span>
						</SegmentedControl.Item>
						<SegmentedControl.Item value="raw">Raw</SegmentedControl.Item>
					</SegmentedControl.Root>
					{/* Why icon segments: a text line can give the track its height with no height class. */}
					<SegmentedControl.Root aria-label="Layout" defaultValue="list" size={size}>
						<SegmentedControl.Item value="list">
							<svg aria-hidden width={16} height={16} />
							<span className="sr-only">List</span>
						</SegmentedControl.Item>
						<SegmentedControl.Item value="grid">
							<svg aria-hidden width={16} height={16} />
							<span className="sr-only">Grid</span>
						</SegmentedControl.Item>
					</SegmentedControl.Root>
					<IconButton appearance="ghost" intent="neutral" size={size} label="Copy" icon={<svg />} />
					<Button appearance="outlined" intent="neutral" size={size}>
						Save
					</Button>
				</div>,
			);

			const control = screen.getByRole("radiogroup", { name: "View" });
			const button = screen.getByRole("button", { name: "Copy" });
			expect(control).toHaveAttribute("data-size", size);
			const buttonHeight = button.getBoundingClientRect().height;
			expect(control.getBoundingClientRect().height).toBe(buttonHeight);
			const iconControl = screen.getByRole("radiogroup", { name: "Layout" });
			expect(iconControl.getBoundingClientRect().height).toBe(buttonHeight);
			for (const name of ["List", "Grid"]) {
				const { width, height } = item(name).getBoundingClientRect();
				expect(width).toBe(height);
			}
			const buttonPadding = getComputedStyle(
				screen.getByRole("button", { name: "Save" }),
			).paddingInlineStart;
			// Why a span: it measures the line box, so the label keeps 2px above and below.
			const line = screen.getByText("Headers").getBoundingClientRect();
			const headers = item("Headers").getBoundingClientRect();
			expect(line.top - headers.top).toBeGreaterThanOrEqual(2);
			expect(headers.bottom - line.bottom).toBeGreaterThanOrEqual(2);
			for (const name of ["Headers", "Raw"]) {
				expect(item(name).scrollHeight).toBeLessThanOrEqual(item(name).clientHeight);
				expect(getComputedStyle(item(name)).paddingInlineStart).toBe(buttonPadding);
				// Why a range: a label that spills into the padding still reports no overflow.
				const label = document.createRange();
				label.selectNodeContents(screen.getByText(name));
				const padding = Number.parseFloat(buttonPadding);
				expect(label.getBoundingClientRect().width + 2 * padding).toBeLessThanOrEqual(
					item(name).getBoundingClientRect().width + 0.5,
				);
			}
		},
	);
});

/** Renders a 300px control with "Prod" checked, and returns its `::before` thumb animations. */
function renderForSlide() {
	render(
		<div style={{ width: 300 }}>
			<SegmentedControl.Root aria-label="Environment" defaultValue="prod">
				<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
				<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
			</SegmentedControl.Root>
		</div>,
	);
	const control = screen.getByRole("radiogroup", { name: "Environment" });
	return () =>
		control
			.getAnimations({ subtree: true })
			.filter(
				({ effect }) => effect instanceof KeyframeEffect && effect.pseudoElement === "::before",
			);
}

describe("SegmentedControl thumb", () => {
	test("a click slides the thumb to the checked item", async () => {
		const thumbAnimations = renderForSlide();

		await userEvent.click(item("Dev"));

		expect(thumbAnimations()).toHaveLength(1);
	});

	test("a new controlled value slides the thumb", () => {
		const { setValue } = renderEnvironments();
		const group = screen.getByRole("radiogroup", { name: "Environment" });

		setValue("dev");

		// Why skip CSS transitions: the thumb's width transition runs too, because the items differ in width.
		const slides = group
			.getAnimations({ subtree: true })
			.filter(
				(animation) =>
					!(animation instanceof CSSTransition) &&
					animation.effect instanceof KeyframeEffect &&
					animation.effect.pseudoElement === "::before",
			);
		expect(slides).toHaveLength(1);
	});

	test("a form reset slides the thumb back, and the next click slides it again", async () => {
		render(
			<form aria-label="Environment form" style={{ width: 300 }}>
				<SegmentedControl.Root aria-label="Environment" name="env" defaultValue="prod">
					<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
					<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
				</SegmentedControl.Root>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Environment form" });
		const control = screen.getByRole("radiogroup", { name: "Environment" });
		const slides = () =>
			control
				.getAnimations({ subtree: true })
				.filter(
					(animation) =>
						!(animation instanceof CSSTransition) &&
						animation.effect instanceof KeyframeEffect &&
						animation.effect.pseudoElement === "::before",
				);
		await userEvent.click(item("Dev"));
		for (const slide of slides()) {
			slide.finish();
		}

		form.reset();
		await vi.waitFor(() => {
			expect(screen.getByRole("radio", { name: "Prod" })).toBeChecked();
			expect(slides()).toHaveLength(1);
		});
		for (const slide of slides()) {
			slide.finish();
		}

		await userEvent.click(item("Dev"));
		expect(slides()).toHaveLength(1);
	});

	test("with reduced motion, the thumb moves at once", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		const thumbAnimations = renderForSlide();

		await userEvent.click(item("Dev"));

		expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked();
		expect(thumbAnimations()).toHaveLength(0);
	});
});

/**
 * Renders a 300px control of three items, "Dev", "Staging", and "Prod", with
 * "Prod" checked. `drag` moves a synthetic pointer from the center of "Prod"
 * through each stop, one frame (16ms) apart. A `rest` before the release
 * clears the pointer's speed, so the release is not a flick.
 */
function renderEnvironments({
	stagingDisabled = false,
	dir,
}: { stagingDisabled?: boolean; dir?: "rtl" } = {}) {
	const onChange = vi.fn<(value: string) => void>();
	const ui = (value?: string) => (
		<div dir={dir} style={{ width: 300 }}>
			<SegmentedControl.Root
				aria-label="Environment"
				defaultValue="prod"
				value={value}
				onValueChange={onChange}
			>
				<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
				<SegmentedControl.Item value="staging" disabled={stagingDisabled}>
					Staging
				</SegmentedControl.Item>
				<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
			</SegmentedControl.Root>
		</div>
	);
	const { rerender } = render(ui());
	/** Sets a controlled `value`, as a parent does. */
	const setValue = (value: string) => rerender(ui(value));
	const prod = screen.getByRole("radio", { name: "Prod" });
	const rect = prod.getBoundingClientRect();
	const start = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;
	// Why a fixed time stamp: the drag reads the pointer's speed from
	// `timeStamp`, and real time between synthetic events is noise.
	const send = ({
		type,
		clientX,
		timeStamp,
		target = prod,
	}: {
		type: string;
		clientX: number;
		timeStamp: number;
		target?: Element;
	}) => {
		const event = new PointerEvent(type, {
			pointerId: 1,
			isPrimary: true,
			button: 0,
			buttons: type === "pointerup" ? 0 : 1,
			bubbles: true,
			clientX,
			clientY,
		});
		Object.defineProperty(event, "timeStamp", { value: timeStamp });
		target.dispatchEvent(event);
	};
	const drag = (stops: readonly number[], { rest }: { rest: boolean }) => {
		send({ type: "pointerdown", clientX: start, timeStamp: 0 });
		for (const [index, stop] of stops.entries()) {
			send({ type: "pointermove", clientX: start + stop, timeStamp: (index + 1) * 16 });
		}
		const releaseTime = stops.length * 16 + (rest ? 120 : 0);
		send({ type: "pointerup", clientX: start + (stops.at(-1) ?? 0), timeStamp: releaseTime });
	};
	return { drag, onChange, send, setValue, start };
}

describe("SegmentedControl drag", () => {
	test("dragging the thumb onto another segment checks it", () => {
		const { drag, onChange } = renderEnvironments();

		drag([-60, -120, -200], { rest: true });

		expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("dev");
	});

	test("a drag released nearest the checked segment keeps it", () => {
		const { drag, onChange } = renderEnvironments();

		drag([-20, -40], { rest: true });

		expect(screen.getByRole("radio", { name: "Prod" })).toBeChecked();
		expect(onChange).not.toHaveBeenCalled();
	});

	test("a flick carries the thumb past the segment under it", () => {
		const { drag, onChange } = renderEnvironments();

		// Why these stops: a rested release 40px off center keeps "Prod" (the test
		// above), so only the flick's speed can reach "Dev".
		drag([-10, -40], { rest: false });

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("dev");
	});

	test("in RTL, dragging the thumb right checks the segment on the right", () => {
		// Why right: in RTL, "Prod" is on the left and "Dev" is on the right.
		const { drag, onChange } = renderEnvironments({ dir: "rtl" });

		drag([60, 120, 200], { rest: true });

		expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked();
		expect(onChange).toHaveBeenLastCalledWith("dev");
	});

	test("a new value during a drag keeps the thumb under the pointer", () => {
		const { send, setValue, start } = renderEnvironments();
		const prodLeft = screen.getByRole("radio", { name: "Prod" }).getBoundingClientRect().left;
		const devLeft = screen.getByRole("radio", { name: "Dev" }).getBoundingClientRect().left;
		// Why the computed translate: the checked item draws the thumb at its left
		// edge, moved by its `translate`.
		const thumbLeft = () =>
			devLeft + Number.parseFloat(getComputedStyle(item("Dev"), "::before").translate);

		send({ type: "pointerdown", clientX: start, timeStamp: 0 });
		send({ type: "pointermove", clientX: start - 60, timeStamp: 16 });
		setValue("dev");
		send({ type: "pointermove", clientX: start - 150, timeStamp: 32 });

		expect(thumbLeft()).toBeCloseTo(prodLeft - 150, 0);
	});

	test("the thumb skips a disabled segment", () => {
		const { drag, onChange } = renderEnvironments({ stagingDisabled: true });

		drag([-60, -110], { rest: true });

		expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked();
		expect(onChange).toHaveBeenLastCalledWith("dev");
	});

	test("a release outside the group ends the drag", () => {
		const { onChange, send, start } = renderEnvironments();
		const group = screen.getByRole("radiogroup", { name: "Environment" });

		send({ type: "pointerdown", clientX: start, timeStamp: 0 });
		send({ type: "pointermove", clientX: start - 200, timeStamp: 16 });
		expect(group).toHaveAttribute("data-dragging");
		send({ type: "pointerup", clientX: start - 200, timeStamp: 200, target: document.body });
		send({ type: "pointermove", clientX: start, timeStamp: 216 });

		expect(group).not.toHaveAttribute("data-dragging");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("dev");
	});

	test("a move with no button down ends a drag whose release the page missed", () => {
		const { send, start } = renderEnvironments();
		const group = screen.getByRole("radiogroup", { name: "Environment" });

		send({ type: "pointerdown", clientX: start, timeStamp: 0 });
		send({ type: "pointermove", clientX: start - 60, timeStamp: 16 });
		expect(group).toHaveAttribute("data-dragging");
		const hover = new PointerEvent("pointermove", {
			pointerId: 1,
			isPrimary: true,
			buttons: 0,
			bubbles: true,
		});
		document.body.dispatchEvent(hover);

		expect(group).not.toHaveAttribute("data-dragging");
	});
});

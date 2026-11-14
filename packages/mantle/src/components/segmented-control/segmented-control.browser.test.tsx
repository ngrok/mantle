import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { SegmentedControl } from "./segmented-control.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. Without the
// component's real utilities, the items do not lay out in a row.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		await commands.tailwindCss("./segmented-control.tsx"),
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

		const item = screen.getByRole("radio", { name: /last week/ });
		expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight);
		expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
	});
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

		await userEvent.click(screen.getByRole("radio", { name: "Dev" }));

		expect(thumbAnimations()).toHaveLength(1);
	});

	test("with reduced motion, the thumb moves at once", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		const thumbAnimations = renderForSlide();

		await userEvent.click(screen.getByRole("radio", { name: "Dev" }));

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
function renderEnvironments({ stagingDisabled = false } = {}) {
	const onChange = vi.fn<(value: string) => void>();
	render(
		<div style={{ width: 300 }}>
			<SegmentedControl.Root aria-label="Environment" defaultValue="prod" onChange={onChange}>
				<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
				<SegmentedControl.Item value="staging" disabled={stagingDisabled}>
					Staging
				</SegmentedControl.Item>
				<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
			</SegmentedControl.Root>
		</div>,
	);
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
	return { drag, onChange, send, start };
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

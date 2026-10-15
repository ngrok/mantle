import { act, fireEvent, render, screen } from "@testing-library/react";
import type { RefObject } from "react";
import { useRef } from "react";
import { describe, expect, test, vi } from "vitest";
import type { SwipeDirection, SwipeProperty } from "./use-swipe-to-dismiss.js";
import { rubberBand, shouldDismissSwipe, useSwipeToDismiss } from "./use-swipe-to-dismiss.js";

const thresholds = { threshold: 0.25, flickVelocity: 0.4 };

describe("shouldDismissSwipe", () => {
	test("an offset at the threshold dismisses", () => {
		expect(shouldDismissSwipe({ offset: 75, size: 300, velocity: 0, ...thresholds })).toBe(true);
	});

	test("an offset under the threshold does not dismiss", () => {
		expect(shouldDismissSwipe({ offset: 74, size: 300, velocity: 0, ...thresholds })).toBe(false);
	});

	test("a flick dismisses a short drag", () => {
		expect(shouldDismissSwipe({ offset: 20, size: 300, velocity: 0.4, ...thresholds })).toBe(true);
	});

	test("a drag that ends at the resting position never dismisses, whatever the size", () => {
		expect(shouldDismissSwipe({ offset: 0, size: 0, velocity: 0, ...thresholds })).toBe(false);
	});

	test("a flick back to the resting position after a drag the wrong way never dismisses", () => {
		expect(shouldDismissSwipe({ offset: 0, size: 300, velocity: 8, ...thresholds })).toBe(false);
	});
});

describe("rubberBand", () => {
	test("displaces less than the pointer moved, and ever less per pixel", () => {
		const near = rubberBand(100, 300);
		const far = rubberBand(200, 300);
		expect(near).toBeGreaterThan(0);
		expect(near).toBeLessThan(100);
		expect(far).toBeLessThan(near * 2);
		expect(far).toBeLessThan(300);
	});

	test("a target with no size does not move", () => {
		expect(rubberBand(100, 0)).toBe(0);
	});
});

/**
 * A handle inside a panel. happy-dom lays nothing out, so the panel's rect is
 * stubbed to 300px square: the threshold is then 75px either way.
 */
function Panel({
	onDismiss,
	active,
	direction,
	property,
}: {
	onDismiss: () => void;
	active?: boolean | (() => boolean);
	direction?: SwipeDirection;
	property?: SwipeProperty | (() => SwipeProperty);
}) {
	const panelRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLDivElement>(null);
	useSwipeToDismiss(handleRef, { target: panelRef, onDismiss, active, direction, property });
	return (
		<div ref={panelRef} data-testid="panel">
			<div ref={handleRef} data-testid="handle">
				<button type="button" onClick={onDismiss}>
					close
				</button>
			</div>
		</div>
	);
}

function renderPanel(props: Omit<Parameters<typeof Panel>[0], "onDismiss"> = {}) {
	const onDismiss = vi.fn<() => void>();
	render(<Panel onDismiss={onDismiss} {...props} />);
	const panel = screen.getByTestId("panel");
	vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(
		DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 300 }),
	);
	return { onDismiss, panel, handle: screen.getByTestId("handle") };
}

const pointer = { pointerId: 1, isPrimary: true, button: 0, bubbles: true } as const;

type Position = { x: number; y?: number; at: number };

function pointerEvent(type: string, position: Position, init: Partial<PointerEventInit> = {}) {
	const event = new PointerEvent(type, {
		...pointer,
		...init,
		clientX: position.x,
		clientY: position.y ?? 0,
	});
	Object.defineProperty(event, "timeStamp", { value: position.at });
	return event;
}

/** A pointer that goes down on `handle`, moves through `positions`, and releases at `releaseAt`. */
function swipe(
	handle: HTMLElement,
	positions: ReadonlyArray<Position>,
	{
		release = "pointerup",
		releaseAt,
	}: { release?: "pointerup" | "pointercancel"; releaseAt?: number } = {},
) {
	const [first] = positions;
	if (first == null) {
		throw new Error("A swipe needs at least one position.");
	}
	act(() => {
		fireEvent(handle, pointerEvent("pointerdown", first));
	});
	for (const position of positions.slice(1)) {
		act(() => {
			fireEvent(document, pointerEvent("pointermove", position));
		});
	}
	const last = positions[positions.length - 1] ?? first;
	act(() => {
		fireEvent(document, pointerEvent(release, { ...last, at: releaseAt ?? last.at }));
	});
}

describe("useSwipeToDismiss", () => {
	test("a drag past the threshold calls onDismiss once and clears the inline styles", () => {
		const { onDismiss, panel, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 50, at: 1000 },
			{ x: 100, at: 2000 },
		]);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(panel.style.translate).toBe("");
		expect(panel.style.transition).toBe("");
	});

	test("a drag under the threshold springs back and calls nothing", () => {
		const { onDismiss, panel, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 60, at: 1000 },
		]);
		expect(onDismiss).not.toHaveBeenCalled();
		expect(panel.style.translate).toBe("");
	});

	test("a flick dismisses a short drag", () => {
		const { onDismiss, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 30, at: 10 },
			{ x: 50, at: 20 },
		]);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	test("a pointer that rests before the release is no flick", () => {
		const { onDismiss, handle } = renderPanel();
		swipe(
			handle,
			[
				{ x: 10, at: 0 },
				{ x: 30, at: 10 },
				{ x: 50, at: 20 },
			],
			{ releaseAt: 400 },
		);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test("the target follows the pointer with its transition off while the drag runs", () => {
		const { panel, handle } = renderPanel();
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 10, at: 0 }));
			fireEvent(document, pointerEvent("pointermove", { x: 70, at: 16 }));
		});
		expect(panel.style.translate).toBe("60px");
		expect(panel.style.transition).toBe("none");
	});

	test("a flex-basis drag shrinks the target from its size", () => {
		const { panel, handle } = renderPanel({ property: "flex-basis" });
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 10, at: 0 }));
			fireEvent(document, pointerEvent("pointermove", { x: 70, at: 16 }));
		});
		expect(panel.style.flexBasis).toBe("240px");
		expect(panel.style.translate).toBe("");
		act(() => {
			fireEvent(document, pointerEvent("pointerup", { x: 70, at: 32 }));
		});
		expect(panel.style.flexBasis).toBe("");
	});

	test("a property function is asked at pointer down", () => {
		const property = vi.fn<() => SwipeProperty>(() => "flex-basis");
		const { panel, handle } = renderPanel({ property });
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 10, at: 0 }));
			fireEvent(document, pointerEvent("pointermove", { x: 70, at: 16 }));
		});
		expect(property).toHaveBeenCalledTimes(1);
		expect(panel.style.flexBasis).toBe("240px");
	});

	test("a drag toward the start edge meets rubber-band resistance and never dismisses", () => {
		const { onDismiss, panel, handle } = renderPanel();
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 200, at: 0 }));
			fireEvent(document, pointerEvent("pointermove", { x: 100, at: 16 }));
		});
		const displacement = Number.parseFloat(panel.style.translate);
		expect(displacement).toBeLessThan(0);
		expect(displacement).toBeGreaterThan(-100);
		act(() => {
			fireEvent(document, pointerEvent("pointerup", { x: 100, at: 32 }));
		});
		expect(panel.style.translate).toBe("");
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test("a gesture that travels further across the direction never starts a drag", () => {
		const { onDismiss, panel, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, y: 10, at: 0 },
			{ x: 20, y: 40, at: 16 },
			{ x: 200, y: 40, at: 32 },
		]);
		expect(panel.style.translate).toBe("");
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test("a move inside the slop starts no drag, so the click on a control inside the handle lands", () => {
		const { onDismiss, panel, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 15, at: 100 },
		]);
		expect(panel.style.translate).toBe("");
		fireEvent.click(screen.getByRole("button", { name: "close" }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	test("the click that follows a drag never reaches a control inside the handle", () => {
		const { onDismiss, handle } = renderPanel();
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 60, at: 1000 },
		]);
		fireEvent.click(screen.getByRole("button", { name: "close" }));
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test("a handle that unmounts mid-drag clears the target it leaves behind", () => {
		function Handle({ target }: { target: RefObject<HTMLDivElement | null> }) {
			const handleRef = useRef<HTMLDivElement>(null);
			useSwipeToDismiss(handleRef, { target, onDismiss: () => {} });
			return <div ref={handleRef} data-testid="handle" />;
		}
		function Detachable({ withHandle }: { withHandle: boolean }) {
			const panelRef = useRef<HTMLDivElement>(null);
			return (
				<div ref={panelRef} data-testid="panel">
					{withHandle && <Handle target={panelRef} />}
				</div>
			);
		}
		const { rerender } = render(<Detachable withHandle />);
		const panel = screen.getByTestId("panel");
		vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 300 }),
		);
		act(() => {
			fireEvent(screen.getByTestId("handle"), pointerEvent("pointerdown", { x: 10, at: 0 }));
			fireEvent(document, pointerEvent("pointermove", { x: 70, at: 16 }));
		});
		expect(panel.style.translate).toBe("60px");
		rerender(<Detachable withHandle={false} />);
		expect(panel.style.translate).toBe("");
		expect(panel.style.transition).toBe("");
	});

	test("a cancelled pointer springs back without dismissing", () => {
		const { onDismiss, panel, handle } = renderPanel();
		swipe(
			handle,
			[
				{ x: 10, at: 0 },
				{ x: 200, at: 1000 },
			],
			{ release: "pointercancel" },
		);
		expect(onDismiss).not.toHaveBeenCalled();
		expect(panel.style.translate).toBe("");
	});

	test("an inactive hook starts no drag", () => {
		const { onDismiss, panel, handle } = renderPanel({ active: false });
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 200, at: 1000 },
		]);
		expect(panel.style.translate).toBe("");
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test("a function active is asked at pointer down", () => {
		const active = vi.fn<() => boolean>(() => true);
		const { onDismiss, handle } = renderPanel({ active });
		swipe(handle, [
			{ x: 10, at: 0 },
			{ x: 200, at: 1000 },
		]);
		expect(active).toHaveBeenCalledTimes(1);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	test("a secondary button starts no drag", () => {
		const { onDismiss, panel, handle } = renderPanel();
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 10, at: 0 }, { button: 2 }));
			fireEvent(document, pointerEvent("pointermove", { x: 200, at: 16 }));
		});
		expect(panel.style.translate).toBe("");
		expect(onDismiss).not.toHaveBeenCalled();
	});

	test.each<[SwipeDirection, { x: number; y: number }, string]>([
		["left", { x: -60, y: 0 }, "-60px"],
		["down", { x: 0, y: 60 }, "0 60px"],
		["up", { x: 0, y: -60 }, "0 -60px"],
	])("direction %s moves the target along its own axis", (direction, delta, translate) => {
		const { panel, handle } = renderPanel({ direction });
		act(() => {
			fireEvent(handle, pointerEvent("pointerdown", { x: 100, y: 100, at: 0 }));
			fireEvent(
				document,
				pointerEvent("pointermove", { x: 100 + delta.x, y: 100 + delta.y, at: 16 }),
			);
		});
		expect(panel.style.translate).toBe(translate);
	});
});

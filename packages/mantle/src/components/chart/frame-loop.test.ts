import { expect, test, vi } from "vitest";
import { requestSharedFrame } from "./frame-loop.js";

/** The window, with animation frames that run only when the test flushes them. */
const createView = () => {
	const frames = new Map<number, FrameRequestCallback>();
	let next = 0;
	const requestAnimationFrame = vi
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => {
			next += 1;
			frames.set(next, callback);
			return next;
		});
	const cancelAnimationFrame = vi
		.spyOn(window, "cancelAnimationFrame")
		.mockImplementation((handle) => {
			frames.delete(handle);
		});
	const view = window;
	const flush = (): void => {
		const pending = [...frames.values()];
		frames.clear();
		for (const callback of pending) {
			callback(0);
		}
	};
	return { view, requestAnimationFrame, cancelAnimationFrame, flush };
};

test("every request in one frame shares one animation frame and runs once", () => {
	const { view, requestAnimationFrame, flush } = createView();
	const first = vi.fn<() => void>();
	const second = vi.fn<() => void>();
	requestSharedFrame(view, first);
	requestSharedFrame(view, second);
	requestSharedFrame(view, first);
	expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
	flush();
	expect(first).toHaveBeenCalledTimes(1);
	expect(second).toHaveBeenCalledTimes(1);
});

test("a callback that asks again inside its frame runs in the next frame, not this one", () => {
	const { view, requestAnimationFrame, flush } = createView();
	const animate = vi.fn<() => void>(() => {
		if (animate.mock.calls.length < 2) {
			requestSharedFrame(view, animate);
		}
	});
	requestSharedFrame(view, animate);
	flush();
	expect(animate).toHaveBeenCalledTimes(1);
	expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
	flush();
	expect(animate).toHaveBeenCalledTimes(2);
});

test("canceling the last request cancels the animation frame", () => {
	const { view, cancelAnimationFrame, flush } = createView();
	const canceledFirst = vi.fn<() => void>();
	const dropped = vi.fn<() => void>();
	requestSharedFrame(view, canceledFirst)();
	const cancelDropped = requestSharedFrame(view, dropped);
	expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
	cancelDropped();
	expect(cancelAnimationFrame).toHaveBeenCalledTimes(2);
	flush();
	expect(canceledFirst).toHaveBeenCalledTimes(0);
	expect(dropped).toHaveBeenCalledTimes(0);
});

test("a callback that throws does not stop the callbacks after it", () => {
	const { view, flush } = createView();
	const failure = new Error("commit failed");
	const healthy = vi.fn<() => void>();
	requestSharedFrame(view, () => {
		throw failure;
	});
	requestSharedFrame(view, healthy);
	expect(flush).toThrow(failure);
	expect(healthy).toHaveBeenCalledTimes(1);
	requestSharedFrame(view, healthy);
	flush();
	expect(healthy).toHaveBeenCalledTimes(2);
});

test("two callbacks that throw surface both errors", () => {
	const { view, flush } = createView();
	requestSharedFrame(view, () => {
		throw new Error("first");
	});
	requestSharedFrame(view, () => {
		throw new Error("second");
	});
	expect(flush).toThrow(AggregateError);
});

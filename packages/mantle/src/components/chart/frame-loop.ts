/**
 * The animation-frame loop chart engines share. A page of 100 charts that all
 * repaint for one theme switch, resize, or data push asks for one animation
 * frame per window instead of 100, and the engines commit inside it in the
 * order they asked.
 *
 * This module is internal shared implementation — not exported from the package.
 */

type FrameLoop = {
	callbacks: Set<() => void>;
	handle: number;
};

const loops = new WeakMap<Window, FrameLoop>();

const run = (view: Window, loop: FrameLoop): void => {
	loop.handle = 0;
	// Why a new set: a callback that asks for the next frame joins it, so a
	// chart mid-animation commits once per frame and not twice in this one.
	const callbacks = loop.callbacks;
	loop.callbacks = new Set();
	// Why catch: each engine marks itself scheduled until its callback runs. A
	// chart that throws must not leave the charts after it unable to repaint.
	const errors: unknown[] = [];
	// A Set skips an entry deleted mid-loop, so a callback that an earlier one
	// cancels does not run.
	for (const callback of callbacks) {
		try {
			callback();
		} catch (error) {
			errors.push(error);
		}
	}
	if (loop.callbacks.size === 0 && loops.get(view) === loop) {
		loops.delete(view);
	}
	if (errors.length === 1) {
		throw errors[0];
	}
	if (errors.length > 1) {
		throw new AggregateError(errors, "More than one chart failed to commit a frame.");
	}
};

/**
 * Run `callback` in the window's next shared animation frame. A second
 * request for the same callback before that frame is a no-op. Returns the
 * function that cancels the request.
 *
 * @example
 * ```ts
 * const cancel = requestSharedFrame(window, commit);
 * ```
 */
const requestSharedFrame = (view: Window, callback: () => void): (() => void) => {
	let loop = loops.get(view);
	if (loop == null) {
		loop = { callbacks: new Set(), handle: 0 };
		loops.set(view, loop);
	}
	const current = loop;
	// Why keep the set: a cancel during the frame removes the callback from
	// the set that frame runs, and leaves a request for the next frame alone.
	const callbacks = current.callbacks;
	callbacks.add(callback);
	if (current.handle === 0) {
		current.handle = view.requestAnimationFrame(() => run(view, current));
	}
	return () => {
		callbacks.delete(callback);
		if (callbacks === current.callbacks && callbacks.size === 0 && current.handle !== 0) {
			view.cancelAnimationFrame(current.handle);
			current.handle = 0;
			loops.delete(view);
		}
	};
};

export {
	//,
	requestSharedFrame,
};

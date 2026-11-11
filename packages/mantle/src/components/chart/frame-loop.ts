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
	// Why a snapshot: a callback that asks for the next frame joins a new set,
	// so a chart mid-animation commits once per frame and not twice in this one.
	const callbacks = [...loop.callbacks];
	loop.callbacks.clear();
	for (const callback of callbacks) {
		callback();
	}
	if (loop.callbacks.size === 0) {
		loops.delete(view);
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
	current.callbacks.add(callback);
	if (current.handle === 0) {
		current.handle = view.requestAnimationFrame(() => run(view, current));
	}
	return () => {
		current.callbacks.delete(callback);
		if (current.callbacks.size === 0 && current.handle !== 0) {
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

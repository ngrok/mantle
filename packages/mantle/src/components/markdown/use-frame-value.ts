"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value`, updated at most once per animation frame while `throttle`
 * is `true`. The first change after a quiet frame shows at once. A change
 * that comes in the same frame waits for the next one, and only the newest
 * value shows. When `throttle` is `false`, `value` returns as it is.
 *
 * Why: a stream can deliver many chunks in one frame, and each one would
 * otherwise render the answer again.
 *
 * @example
 * const shown = useFrameValue(text, { throttle: isStreaming });
 */
function useFrameValue<T>(value: T, { throttle }: { throttle: boolean }): T {
	const [frame, setFrame] = useState({ shown: value, ready: true });
	if (throttle && frame.ready && !Object.is(frame.shown, value)) {
		setFrame({ shown: value, ready: false });
	}
	useEffect(() => {
		if (frame.ready) {
			return undefined;
		}
		const id = requestAnimationFrame(() => {
			setFrame((current) => ({ shown: current.shown, ready: true }));
		});
		return () => {
			cancelAnimationFrame(id);
		};
	}, [frame]);
	return throttle ? frame.shown : value;
}

export {
	//,
	useFrameValue,
};

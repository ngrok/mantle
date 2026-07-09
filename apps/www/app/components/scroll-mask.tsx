import { composeRefs } from "@ngrok/mantle/utils";
import type { ComponentProps, ComponentRef } from "react";
import { useEffect, useMemo, useRef } from "react";

const FADE = "1.5rem";

/**
 * Wraps a vertically-scrolling container with a fade-out mask applied only to
 * the edges that currently have scrollable content beyond them. When content
 * fits (or the user is already at an edge), that edge renders cleanly with no
 * fade. Pair with `overflow-y-auto` on the same element.
 */
export function ScrollMask({ ref, ...props }: ComponentProps<"div">) {
	const elementRef = useRef<ComponentRef<"div">>(null);
	const composedRef = useMemo(() => composeRefs(ref, elementRef), [ref]);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) {
			return;
		}

		let rafId: number | undefined;
		let prevTop = false;
		let prevBottom = false;
		let initialized = false;

		const compute = () => {
			rafId = undefined;
			const { scrollTop, scrollHeight, clientHeight } = element;
			const top = scrollTop > 0;
			const bottom = scrollTop + clientHeight < scrollHeight - 1;

			if (initialized && top === prevTop && bottom === prevBottom) {
				return;
			}
			initialized = true;
			prevTop = top;
			prevBottom = bottom;

			if (!top && !bottom) {
				element.style.removeProperty("mask-image");
				element.style.removeProperty("-webkit-mask-image");
				return;
			}

			const startStop = top ? `transparent 0, black ${FADE}` : `black 0`;
			const endStop = bottom ? `black calc(100% - ${FADE}), transparent 100%` : `black 100%`;
			const image = `linear-gradient(to bottom, ${startStop}, ${endStop})`;
			element.style.setProperty("mask-image", image);
			element.style.setProperty("-webkit-mask-image", image);
		};

		const schedule = () => {
			if (rafId == null) {
				rafId = requestAnimationFrame(compute);
			}
		};

		schedule();
		element.addEventListener("scroll", schedule, { passive: true });
		const resizeObserver = new ResizeObserver(schedule);
		resizeObserver.observe(element);
		return () => {
			if (rafId != null) {
				cancelAnimationFrame(rafId);
			}
			element.removeEventListener("scroll", schedule);
			resizeObserver.disconnect();
		};
	}, []);

	return <div ref={composedRef} {...props} />;
}

"use client";

import { useCallback, type RefCallback } from "react";

/** How close to the end, in pixels, a scroll position counts as the end. */
const END_THRESHOLD = 2;

/**
 * Keeps a scroll container at its end while content streams into it, such
 * as a chat transcript. Pass the returned ref to the element that scrolls.
 *
 * - **Follow:** each change to the content scrolls to the end before the
 *   browser paints, so the new text never shows below the fold first.
 * - **Release:** when the user scrolls up by any means (wheel, touch, keys,
 *   or the scrollbar), the container stays where the user put it.
 * - **Return:** when the user scrolls back to the end, it follows again. The
 *   content does not move when it starts to follow, because it is already at
 *   the end.
 *
 * A `MutationObserver` sees each change, and one layout read for each change
 * finds the end.
 *
 * @example
 * ```tsx
 * function Transcript({ answer, isStreaming }: { answer: string; isStreaming: boolean }) {
 *   const scrollRef = useFollowStream();
 *   return (
 *     <div ref={scrollRef} className="h-96 overflow-y-auto">
 *       <Markdown streaming={isStreaming}>{answer}</Markdown>
 *     </div>
 *   );
 * }
 * ```
 */
function useFollowStream<T extends HTMLElement>(): RefCallback<T> {
	return useCallback((element: T | null) => {
		if (element == null) {
			return undefined;
		}
		let isFollowing = true;
		let followedTop = element.scrollTop;

		const follow = () => {
			if (!isFollowing) {
				return;
			}
			// Why `instant`: a `scroll-behavior: smooth` container would animate each update and lag the text.
			element.scrollTo({ top: element.scrollHeight, behavior: "instant" });
			followedTop = element.scrollTop;
		};
		const onScroll = () => {
			const distance = element.scrollHeight - element.clientHeight - element.scrollTop;
			if (distance <= END_THRESHOLD) {
				isFollowing = true;
				followedTop = element.scrollTop;
			} else if (element.scrollTop < followedTop) {
				// Why compare with the last followed position: only the user moves the container up.
				isFollowing = false;
			}
		};

		const mutations = new MutationObserver(follow);
		mutations.observe(element, { childList: true, subtree: true, characterData: true });
		const resizes = new ResizeObserver(follow);
		resizes.observe(element);
		element.addEventListener("scroll", onScroll, { passive: true });
		follow();

		return () => {
			mutations.disconnect();
			resizes.disconnect();
			element.removeEventListener("scroll", onScroll);
		};
	}, []);
}

export {
	//,
	useFollowStream,
};

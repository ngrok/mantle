"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { readWithRetries, type MarkdownStreamSource } from "./read-stream.js";

/** Options for {@link useMarkdownStream}. */
type UseMarkdownStreamOptions = {
	/**
	 * Opens the answer's stream from `offset`, the count of UTF-16 code units
	 * already received (the `length` of the text so far). The hook calls it
	 * again from the new offset after the stream fails, so the server must
	 * skip `offset` characters of the answer. Abort the request with `signal`.
	 */
	read: (options: {
		offset: number;
		signal: AbortSignal;
	}) => MarkdownStreamSource | Promise<MarkdownStreamSource>;
	/**
	 * The text the page already shows, such as a partial answer that the
	 * server rendered before a reload. The stream continues after it.
	 *
	 * @default ""
	 */
	initialText?: string;
	/**
	 * Whether to read the stream. Set `false` for an answer that is already
	 * complete: the hook then returns `initialText` with the status `"done"`.
	 *
	 * @default true
	 */
	enabled?: boolean;
	/**
	 * How many times to open the stream again after it fails before the
	 * status turns `"error"`. Each retry waits twice as long as the last,
	 * from 500 ms. A chunk that arrives resets the count.
	 *
	 * @default 3
	 */
	retries?: number;
};

/** What {@link useMarkdownStream} returns. */
type MarkdownStream = {
	/** The text so far. Pass it to `Markdown` as `children`. */
	text: string;
	/** `"streaming"` while chunks can arrive, `"done"` after the stream ends, and `"error"` after the last retry fails. */
	status: "streaming" | "done" | "error";
	/** The error of the last failed read, while the status is `"error"`. */
	error: unknown;
};

/**
 * Reads a Markdown answer as it streams, for `Markdown`. Text renders at
 * most once per animation frame, however fast chunks arrive.
 *
 * The hook resumes: after a network failure, it opens the stream again from
 * the length of the text so far, and the answer continues with no remount or
 * flash. After a reload, pass the partial answer as `initialText`: the server
 * render and the first client render show the same text, and the stream
 * continues after it.
 *
 * @example
 * ```tsx
 * function Answer({ id, partial }: { id: string; partial: string }) {
 *   const { text, status } = useMarkdownStream({
 *     initialText: partial,
 *     read: async ({ offset, signal }) => {
 *       const response = await fetch(`/answers/${id}?offset=${offset}`, { signal });
 *       if (!response.ok || response.body == null) {
 *         throw new Error(`The answer stream failed: ${response.status}`);
 *       }
 *       return response.body.pipeThrough(new TextDecoderStream());
 *     },
 *   });
 *   return <Markdown streaming={status === "streaming"}>{text}</Markdown>;
 * }
 * ```
 */
function useMarkdownStream({
	read,
	initialText = "",
	enabled = true,
	retries = 3,
}: UseMarkdownStreamOptions): MarkdownStream {
	const [stream, setStream] = useState<MarkdownStream>({
		text: initialText,
		status: enabled ? "streaming" : "done",
		error: undefined,
	});
	const open = useEffectEvent((offset: number, signal: AbortSignal) => read({ offset, signal }));
	const canRetry = useEffectEvent((failures: number) => failures <= retries);
	// Why a ref: the offset outlives one read, such as when the effect runs again.
	const receivedRef = useRef(initialText.length);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const controller = new AbortController();
		let buffer = "";
		let frame = 0;
		const flush = () => {
			frame = 0;
			const chunk = buffer;
			buffer = "";
			setStream((current) => ({ ...current, text: current.text + chunk }));
		};
		const finish = (error: { cause: unknown } | undefined) => {
			if (controller.signal.aborted) {
				return;
			}
			cancelAnimationFrame(frame);
			const chunk = buffer;
			buffer = "";
			setStream((current) =>
				error === undefined
					? { text: current.text + chunk, status: "done", error: undefined }
					: { text: current.text + chunk, status: "error", error: error.cause },
			);
		};
		void readWithRetries({
			open: (offset) => open(offset, controller.signal),
			offset: () => receivedRef.current,
			canRetry,
			signal: controller.signal,
			onChunk: (chunk) => {
				receivedRef.current += chunk.length;
				buffer += chunk;
				if (frame === 0) {
					frame = requestAnimationFrame(flush);
				}
			},
		}).then(finish);
		return () => {
			controller.abort();
			cancelAnimationFrame(frame);
		};
	}, [enabled]);

	return stream;
}

export {
	//,
	useMarkdownStream,
};

export type {
	//,
	MarkdownStream,
	MarkdownStreamSource,
	UseMarkdownStreamOptions,
};

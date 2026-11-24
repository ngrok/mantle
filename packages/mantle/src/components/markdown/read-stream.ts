/** A stream of Markdown text chunks, such as a decoded `fetch` body. */
type MarkdownStreamSource = ReadableStream<string> | AsyncIterable<string>;

/**
 * Yields each chunk of `source` until it ends or `signal` aborts. Why cancel
 * on abort: a pending read never settles by itself, and the producer, such as
 * a `fetch` body, must stop.
 */
async function* chunksOf(
	source: MarkdownStreamSource,
	signal: AbortSignal,
): AsyncGenerator<string> {
	// Why the reader first: Safari's `ReadableStream` is not async iterable.
	if (!("getReader" in source)) {
		yield* source;
		return;
	}
	const reader = source.getReader();
	const cancel = () => {
		void reader.cancel().catch(() => {});
	};
	signal.addEventListener("abort", cancel, { once: true });
	// Why: the signal can abort while the stream opens, before the listener.
	if (signal.aborted) {
		cancel();
	}
	try {
		for (let result = await reader.read(); !result.done; result = await reader.read()) {
			yield result.value;
		}
	} finally {
		signal.removeEventListener("abort", cancel);
		if (signal.aborted) {
			cancel();
		}
		reader.releaseLock();
	}
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, milliseconds);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});
}

/**
 * Reads a stream to its end, and opens it again from the new offset after
 * each failure while `canRetry` allows. Resolves `undefined` when the stream
 * ends, or `{ cause }` with the last error.
 */
async function readWithRetries({
	open,
	offset,
	canRetry,
	signal,
	onChunk,
}: {
	open: (offset: number) => MarkdownStreamSource | Promise<MarkdownStreamSource>;
	offset: () => number;
	canRetry: (failures: number) => boolean;
	signal: AbortSignal;
	onChunk: (chunk: string) => void;
}): Promise<{ cause: unknown } | undefined> {
	let failures = 0;
	// Why the check: an abort during the wait before a retry must not open the stream again.
	while (!signal.aborted) {
		try {
			for await (const chunk of chunksOf(await open(offset()), signal)) {
				if (signal.aborted) {
					return undefined;
				}
				failures = 0;
				onChunk(chunk);
			}
			return undefined;
		} catch (error) {
			failures += 1;
			if (signal.aborted || !canRetry(failures)) {
				return { cause: error };
			}
			await wait(500 * 2 ** (failures - 1), signal);
		}
	}
	return undefined;
}

export {
	//,
	readWithRetries,
};

export type {
	//,
	MarkdownStreamSource,
};

/** A stream of Markdown text chunks, such as a decoded `fetch` body. */
type MarkdownStreamSource = ReadableStream<string> | AsyncIterable<string>;

async function* chunksOf(source: MarkdownStreamSource): AsyncGenerator<string> {
	// Why the reader first: Safari's `ReadableStream` is not async iterable.
	if (!("getReader" in source)) {
		yield* source;
		return;
	}
	const reader = source.getReader();
	try {
		for (let result = await reader.read(); !result.done; result = await reader.read()) {
			yield result.value;
		}
	} finally {
		reader.releaseLock();
	}
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, milliseconds);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			resolve();
		});
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
	for (;;) {
		try {
			for await (const chunk of chunksOf(await open(offset()))) {
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
}

export {
	//,
	readWithRetries,
};

export type {
	//,
	MarkdownStreamSource,
};

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
		const iterator = source[Symbol.asyncIterator]();
		// Why a race: `return()` does not settle a pending `next()`, so the read must also end on abort.
		// Why a listener for each read: a reaction for each chunk on one shared promise grows until the end.
		const next = () =>
			new Promise<IteratorResult<string>>((resolve, reject) => {
				const end = () => resolve({ done: true, value: undefined });
				if (signal.aborted) {
					end();
					return;
				}
				signal.addEventListener("abort", end, { once: true });
				iterator
					.next()
					.then(resolve, reject)
					.finally(() => signal.removeEventListener("abort", end));
			});
		let stopped = false;
		const stop = () => {
			if (!stopped) {
				stopped = true;
				void Promise.resolve(iterator.return?.()).catch(() => {});
			}
		};
		signal.addEventListener("abort", stop, { once: true });
		if (signal.aborted) {
			stop();
		}
		try {
			for (let result = await next(); !result.done; result = await next()) {
				yield result.value;
			}
		} finally {
			signal.removeEventListener("abort", stop);
			if (signal.aborted) {
				stop();
			}
		}
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
		const end = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", end);
			resolve();
		};
		const timer = setTimeout(end, milliseconds);
		signal.addEventListener("abort", end, { once: true });
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

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useMarkdownStream } from "./use-markdown-stream.js";

/** An async stream of `chunks` that throws after the last one when `fail` is set. */
async function* chunks(values: readonly string[], { fail }: { fail: boolean }) {
	for (const value of values) {
		yield value;
	}
	if (fail) {
		throw new Error("The connection dropped.");
	}
}

describe("useMarkdownStream", () => {
	test("opens the stream again from the received length after a failure", async () => {
		const answer = "# Title\n\nSome **bold** text.";
		const offsets: number[] = [];
		const { result } = renderHook(() =>
			useMarkdownStream({
				initialText: "# Ti",
				read: ({ offset }) => {
					offsets.push(offset);
					// The first read drops after two chunks; the retry sends the rest.
					return offsets.length === 1
						? chunks(["tle\n\n", "Some **"], { fail: true })
						: chunks([answer.slice(offset)], { fail: false });
				},
			}),
		);

		expect(result.current.text).toBe("# Ti");
		await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 2000 });
		expect(result.current.text).toBe(answer);
		expect(offsets).toEqual([4, 16]);
	});

	test("reports the error after the last retry", async () => {
		let reads = 0;
		const { result } = renderHook(() =>
			useMarkdownStream({
				retries: 0,
				read: () => {
					reads += 1;
					return chunks(["Partial"], { fail: true });
				},
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.text).toBe("Partial");
		expect(result.current.error).toBeInstanceOf(Error);
		expect(reads).toBe(1);
	});

	test("cancels a stream that opens after it unmounts", async () => {
		const cancel = vi.fn<() => void>();
		let resolveOpen: (source: ReadableStream<string>) => void = () => {};
		const { unmount } = renderHook(() =>
			useMarkdownStream({
				read: () =>
					new Promise<ReadableStream<string>>((resolve) => {
						resolveOpen = resolve;
					}),
			}),
		);
		unmount();
		resolveOpen(new ReadableStream<string>({ cancel }));
		await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
	});

	test("cancels a pending read when it unmounts", async () => {
		const cancel = vi.fn<() => void>();
		const { unmount } = renderHook(() =>
			useMarkdownStream({ read: () => new ReadableStream<string>({ cancel }) }),
		);
		await act(async () => {
			await Promise.resolve();
		});
		unmount();
		await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
	});

	test("opens no stream again after it turns off during the wait before a retry", async () => {
		vi.useFakeTimers();
		let reads = 0;
		const { result, rerender } = renderHook(
			({ enabled }) =>
				useMarkdownStream({
					enabled,
					read: () => {
						reads += 1;
						return chunks([], { fail: true });
					},
				}),
			{ initialProps: { enabled: true } },
		);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		rerender({ enabled: false });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		vi.useRealTimers();
		expect(reads).toBe(1);
		expect(result.current.status).toBe("done");
	});

	test("keeps the text of the last frame when it turns off, and streams again when it turns on", async () => {
		vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
		const offsets: number[] = [];
		const { result, rerender } = renderHook(
			({ enabled }) =>
				useMarkdownStream({
					enabled,
					read: async function* ({ offset }) {
						offsets.push(offset);
						yield offsets.length === 1 ? "Hello" : " world";
						// Why: the stream stays open until the hook turns off.
						await new Promise(() => {});
					},
				}),
			{ initialProps: { enabled: true } },
		);
		await act(async () => {
			await Promise.resolve();
		});
		// The chunk waits for the next frame, and the hook turns off first.
		rerender({ enabled: false });
		expect(result.current.text).toBe("Hello");
		rerender({ enabled: true });
		expect(result.current.status).toBe("streaming");
		await act(async () => {
			// Why the ticks: the async generator yields its chunk a few microtasks after it opens.
			for (let tick = 0; tick < 5; tick += 1) {
				await Promise.resolve();
			}
			vi.advanceTimersToNextFrame();
		});
		vi.useRealTimers();
		expect(offsets).toEqual([0, 5]);
		expect(result.current.text).toBe("Hello world");
	});
});

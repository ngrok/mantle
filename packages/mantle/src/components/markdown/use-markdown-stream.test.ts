import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
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
});

// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { type ChatAnswer, type ChatEvent, type Respond, applyChatEvent, useChat } from "./chat";

/** A stream that waits until its request aborts, so each answer stays in flight. */
const respond: Respond = async function* ({ signal }) {
	await new Promise((_, reject) => {
		signal.addEventListener("abort", () => reject(signal.reason));
	});
	yield { type: "text", text: "never" };
};

/**
 * A stream the test drives: `push` sends an event, `end` closes the stream,
 * and `fail` makes it throw. Each call to `respond` starts a new stream.
 * A step resolves when the stream asks for its next event or closes, so the
 * hook has read the event by then.
 */
function controlledStream() {
	let next: ((result: IteratorResult<ChatEvent> | Error) => void) | null = null;
	let settled: (() => void) | null = null;
	const pending: (IteratorResult<ChatEvent> | Error)[] = [];
	const notify = () => {
		settled?.();
		settled = null;
	};
	const respond: Respond = async function* () {
		try {
			while (true) {
				const result =
					pending.shift() ??
					(await new Promise<IteratorResult<ChatEvent> | Error>((resolve) => {
						next = resolve;
						notify();
					}));
				if (result instanceof Error) {
					throw result;
				}
				if (result.done === true) {
					return;
				}
				yield result.value;
			}
		} finally {
			notify();
		}
	};
	const step = (result: IteratorResult<ChatEvent> | Error) =>
		act(async () => {
			const done = new Promise<void>((resolve) => {
				settled = resolve;
			});
			if (next == null) {
				pending.push(result);
			} else {
				const resolve = next;
				next = null;
				resolve(result);
			}
			await done;
		});
	return {
		respond,
		push: (event: ChatEvent) => step({ done: false, value: event }),
		end: () => step({ done: true, value: undefined }),
		fail: () => step(new Error("network")),
	};
}

const emptyAnswer: ChatAnswer = {
	id: "a",
	from: "assistant",
	reasoning: "",
	reasoningSeconds: null,
	tools: [],
	text: "",
	status: "streaming",
};

function lastAnswer(messages: ReturnType<typeof useChat>["messages"]) {
	const last = messages.at(-1);
	if (last?.from !== "assistant") {
		throw new Error("The last message is not an answer.");
	}
	return last;
}

test("reasoning ends at the first other event, and its length rounds to whole seconds", () => {
	const reasoned = applyChatEvent(emptyAnswer, { type: "reasoning", text: "Think" }, 100);
	const stillReasoning = applyChatEvent(reasoned, { type: "reasoning", text: "ing" }, 900);
	expect(stillReasoning).toMatchObject({ reasoning: "Thinking", reasoningSeconds: null });

	const answered = applyChatEvent(stillReasoning, { type: "text", text: "Hi" }, 2600);
	expect(answered).toMatchObject({ reasoningSeconds: 3, text: "Hi" });
	// A later event keeps the first length.
	expect(applyChatEvent(answered, { type: "text", text: "!" }, 9000)).toMatchObject({
		reasoningSeconds: 3,
		text: "Hi!",
	});
	// An answer with no reasoning never gets a length.
	expect(
		applyChatEvent(emptyAnswer, { type: "text", text: "Hi" }, 5000).reasoningSeconds,
	).toBeNull();
});

test("a tool end updates only its own call, and marks a failure", () => {
	let answer = applyChatEvent(emptyAnswer, { type: "tool-start", id: "1", name: "a", args: {} }, 0);
	answer = applyChatEvent(answer, { type: "tool-start", id: "2", name: "b", args: {} }, 0);
	answer = applyChatEvent(answer, { type: "tool-end", id: "2", result: "x", failed: true }, 0);
	expect(answer.tools.map((tool) => [tool.id, tool.status, tool.result])).toEqual([
		["1", "running", null],
		["2", "failed", "x"],
	]);
});

test("an answer streams its events and ends as done", async () => {
	const stream = controlledStream();
	const { result } = renderHook(() => useChat({ respond: stream.respond }));

	act(() => result.current.send({ text: "hi", files: [], model: "m" }));
	await stream.push({ type: "text", text: "Hel" });
	await stream.push({ type: "text", text: "lo" });
	expect(result.current.streaming).toBe(true);
	expect(lastAnswer(result.current.messages).text).toBe("Hello");

	await stream.end();
	await waitFor(() => expect(result.current.streaming).toBe(false));
	expect(lastAnswer(result.current.messages)).toMatchObject({ text: "Hello", status: "done" });
});

test("a stream that throws ends as failed, keeps its text, and interrupts a running tool", async () => {
	const stream = controlledStream();
	const { result } = renderHook(() => useChat({ respond: stream.respond }));

	act(() => result.current.send({ text: "hi", files: [], model: "m" }));
	await stream.push({ type: "text", text: "Partial" });
	await stream.push({ type: "tool-start", id: "1", name: "lookup", args: {} });
	await stream.fail();

	await waitFor(() =>
		expect(lastAnswer(result.current.messages)).toMatchObject({
			text: "Partial",
			status: "failed",
			tools: [{ id: "1", status: "interrupted" }],
		}),
	);
});

test("stop keeps the text so far and ignores events that arrive later", async () => {
	const stream = controlledStream();
	const { result } = renderHook(() => useChat({ respond: stream.respond }));

	act(() => result.current.send({ text: "hi", files: [], model: "m" }));
	await stream.push({ type: "text", text: "Before" });
	await stream.push({ type: "tool-start", id: "1", name: "lookup", args: {} });
	act(() => result.current.stop());
	// Why no `end`: the stop already closed the stream, so this event is the last it reads.
	await stream.push({ type: "text", text: " after" });

	expect(lastAnswer(result.current.messages)).toMatchObject({
		text: "Before",
		status: "stopped",
		tools: [{ id: "1", status: "interrupted" }],
	});
});

test("retry replaces the last answer and keeps the question", async () => {
	const stream = controlledStream();
	const { result } = renderHook(() => useChat({ respond: stream.respond }));

	act(() => result.current.send({ text: "hi", files: [], model: "m" }));
	await stream.push({ type: "text", text: "Wrong" });
	await stream.fail();
	await waitFor(() => expect(result.current.streaming).toBe(false));
	act(() => result.current.retry("m"));
	await stream.push({ type: "text", text: "Right" });
	await stream.end();

	await waitFor(() =>
		expect(
			result.current.messages.map((message) =>
				message.from === "user" ? message.text : [message.text, message.status],
			),
		).toEqual(["hi", ["Right", "done"]]),
	);
});

test("two sends before a render keep both turns, and the first answer ends as stopped", () => {
	const { result } = renderHook(() => useChat({ respond }));

	act(() => {
		result.current.send({ text: "first", files: [], model: "m" });
		result.current.send({ text: "second", files: [], model: "m" });
	});

	expect(
		result.current.messages.map((message) =>
			message.from === "user" ? message.text : message.status,
		),
	).toEqual(["first", "stopped", "second", "streaming"]);
});

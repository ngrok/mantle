import { useEffect, useRef, useState } from "react";

/** One piece of an answer as it streams. Text arrives as deltas. */
export type ChatEvent =
	| { type: "reasoning"; text: string }
	| { type: "tool-start"; id: string; name: string; args: unknown }
	| { type: "tool-end"; id: string; result: unknown; failed?: boolean }
	| { type: "text"; text: string };

/** A file the person attached to a message. */
export type ChatFile = { id: string; name: string; size: number };

/** A tool call in an answer, with the status `ToolCall.Root` takes. */
export type ChatToolCall = {
	id: string;
	name: string;
	/** The arguments, as JSON. */
	args: unknown;
	/** The result, as JSON, once the call ends. */
	result: unknown;
	status: "running" | "done" | "failed" | "interrupted";
};

/** A message the person sent. */
export type ChatUserMessage = { id: string; from: "user"; text: string; files: ChatFile[] };

/** An answer, with where its stream is. */
export type ChatAnswer = {
	id: string;
	from: "assistant";
	reasoning: string;
	/** How long the model reasoned, once its reasoning ends. */
	reasoningSeconds: number | null;
	tools: ChatToolCall[];
	text: string;
	status: "streaming" | "done" | "stopped" | "failed";
};

export type ChatMessage = ChatUserMessage | ChatAnswer;

/** Streams the answer to the last message. The demo mocks it; an app calls its server. */
export type Respond = (request: {
	messages: ChatMessage[];
	model: string;
	effort: string;
	signal: AbortSignal;
}) => AsyncIterable<ChatEvent>;

/** The model and the effort a person picks for the next answer. */
export type ChatModelChoice = { model: string; effort: string };

/**
 * Applies one event to the answer it belongs to. Pure, so a test can drive an
 * answer with no stream.
 */
export function applyChatEvent(
	answer: ChatAnswer,
	event: ChatEvent,
	elapsedMs: number,
): ChatAnswer {
	const endReasoning =
		event.type !== "reasoning" && answer.reasoning !== "" && answer.reasoningSeconds == null
			? { reasoningSeconds: Math.max(1, Math.round(elapsedMs / 1000)) }
			: null;
	switch (event.type) {
		case "reasoning":
			return { ...answer, reasoning: answer.reasoning + event.text };
		case "tool-start":
			return {
				...answer,
				...endReasoning,
				tools: [
					...answer.tools,
					{ id: event.id, name: event.name, args: event.args, result: null, status: "running" },
				],
			};
		case "tool-end":
			return {
				...answer,
				...endReasoning,
				tools: answer.tools.map((tool) =>
					tool.id === event.id
						? { ...tool, result: event.result, status: event.failed ? "failed" : "done" }
						: tool,
				),
			};
		case "text":
			return { ...answer, ...endReasoning, text: answer.text + event.text };
	}
}

/** Reads one answer's events. A module function, because React Compiler cannot compile `for await`. */
async function readAnswer(
	events: AsyncIterable<ChatEvent>,
	onEvent: (event: ChatEvent) => void,
	signal: AbortSignal,
): Promise<void> {
	for await (const event of events) {
		if (signal.aborted) {
			return;
		}
		onEvent(event);
	}
}

/** Ends an answer: running tools are interrupted unless the answer finished. */
function endAnswer(answer: ChatAnswer, status: ChatAnswer["status"]): ChatAnswer {
	return {
		...answer,
		status,
		tools: answer.tools.map((tool) =>
			tool.status === "running" ? { ...tool, status: "interrupted" } : tool,
		),
	};
}

function newAnswer(): ChatAnswer {
	return {
		id: crypto.randomUUID(),
		from: "assistant",
		reasoning: "",
		reasoningSeconds: null,
		tools: [],
		text: "",
		status: "streaming",
	};
}

/**
 * Holds a chat's messages and streams each answer from `respond`.
 *
 * One answer streams at a time. `stop` keeps the text so far, `retry`
 * replaces the last answer with a new one, and a new message, a stop, a
 * retry, or an unmount aborts the stream in flight. An answer whose stream
 * throws ends as `"failed"` with its text so far.
 *
 * @example
 * ```tsx
 * const chat = useChat({ respond });
 * <PromptInput.Root streaming={chat.streaming} onStop={chat.stop} onSubmit={…}>…</PromptInput.Root>
 * ```
 */
export function useChat({ respond }: { respond: Respond }) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	// Why a ref too: two sends before a render must each build on the other, not on the rendered array.
	const messagesRef = useRef<ChatMessage[]>([]);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => () => abortRef.current?.abort(), []);

	function commit(next: ChatMessage[]) {
		messagesRef.current = next;
		setMessages(next);
	}

	/** Updates the last message, which is the answer that streams. */
	function updateAnswer(update: (answer: ChatAnswer) => ChatAnswer) {
		const current = messagesRef.current;
		const last = current.at(-1);
		if (last?.from === "assistant") {
			commit([...current.slice(0, -1), update(last)]);
		}
	}

	async function stream(history: ChatMessage[], choice: ChatModelChoice) {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		commit([...history, newAnswer()]);

		const startedAt = Date.now();
		let status: ChatAnswer["status"] = "done";
		try {
			await readAnswer(
				respond({
					messages: history,
					model: choice.model,
					effort: choice.effort,
					signal: controller.signal,
				}),
				(event) => updateAnswer((answer) => applyChatEvent(answer, event, Date.now() - startedAt)),
				controller.signal,
			);
		} catch {
			status = "failed";
		}
		// Why: a stop or a newer message already ended this answer.
		if (controller.signal.aborted) {
			return;
		}
		abortRef.current = null;
		updateAnswer((answer) => endAnswer(answer, status));
	}

	const last = messages.at(-1);
	const streaming = last?.from === "assistant" && last.status === "streaming";

	return {
		messages,
		/** True while an answer streams. Hand it to `Conversation.Root` and `PromptInput.Root`. */
		streaming,
		/** Sends a message and streams its answer. */
		send: ({ text, files, ...choice }: { text: string; files: ChatFile[] } & ChatModelChoice) => {
			const message: ChatUserMessage = { id: crypto.randomUUID(), from: "user", text, files };
			const current = messagesRef.current;
			const previous = current.at(-1);
			// Why: a message sent mid-answer keeps that answer as stopped, as the stop button would.
			const history =
				previous?.from === "assistant" && previous.status === "streaming"
					? [...current.slice(0, -1), endAnswer(previous, "stopped")]
					: current;
			void stream([...history, message], choice);
		},
		/** Stops the answer and keeps its text so far. */
		stop: () => {
			abortRef.current?.abort();
			abortRef.current = null;
			updateAnswer((answer) =>
				answer.status === "streaming" ? endAnswer(answer, "stopped") : answer,
			);
		},
		/** Streams a new answer in place of the last one. */
		retry: (choice: ChatModelChoice) => {
			const current = messagesRef.current;
			const history = current.at(-1)?.from === "assistant" ? current.slice(0, -1) : current;
			if (history.at(-1)?.from === "user") {
				void stream(history, choice);
			}
		},
	};
}

// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { type Respond, useChat } from "./chat";

/** A stream that waits until its request aborts, so each answer stays in flight. */
const respond: Respond = async function* ({ signal }) {
	await new Promise((_, reject) => {
		signal.addEventListener("abort", () => reject(signal.reason));
	});
	yield { type: "text", text: "never" };
};

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

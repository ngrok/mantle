import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import * as Conversation from "../conversation/conversation-parts.js";
import * as Message from "../message/message-parts.js";
import * as ConversationOutline from "./conversation-outline-parts.js";

type Turn = { id: string; from: "user" | "assistant"; text: string };

const answer = (lines: number) =>
	Array.from({ length: lines }, (_, index) => `Line ${index + 1}: check the policy.`).join("\n");

const questions = ["What's live?", "Which endpoints have no policy?", "Add a rate limit."];

function turnsWith(lastAnswerLines: number): Turn[] {
	return questions.flatMap((text, index) => [
		{ id: `q${index}`, from: "user" as const, text },
		{
			id: `a${index}`,
			from: "assistant" as const,
			text: answer(index === questions.length - 1 ? lastAnswerLines : 30),
		},
	]);
}

function Chat({ turns }: { turns: Turn[] }) {
	return (
		<div>
			<ConversationOutline.Root>
				<ConversationOutline.Trigger />
				<ConversationOutline.Content>
					{turns
						.filter((turn) => turn.from === "user")
						.map((turn) => (
							<ConversationOutline.Item key={turn.id} target={turn.id}>
								{turn.text}
							</ConversationOutline.Item>
						))}
				</ConversationOutline.Content>
			</ConversationOutline.Root>
			<Conversation.Root>
				{/* The tests load no Tailwind, so the viewport scrolls through inline styles. */}
				<Conversation.Viewport aria-label="Conversation" style={{ height: 200, overflowY: "auto" }}>
					<Conversation.Content>
						{turns.map((turn) => (
							<Message.Root
								key={turn.id}
								id={turn.id}
								from={turn.from}
								style={{ scrollMarginTop: 16 }}
							>
								<Message.Content style={{ whiteSpace: "pre-wrap" }}>{turn.text}</Message.Content>
							</Message.Root>
						))}
					</Conversation.Content>
				</Conversation.Viewport>
			</Conversation.Root>
		</div>
	);
}

function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
}

function viewport(): HTMLElement {
	return screen.getByRole("region", { name: "Conversation" });
}

/** The message's top, from the viewport's top, in pixels. */
function offsetInView(id: string): number {
	const message = document.getElementById(id);
	if (message == null) {
		throw new Error(`No message ${id}.`);
	}
	return message.getBoundingClientRect().top - viewport().getBoundingClientRect().top;
}

function item(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

describe("ConversationOutline", () => {
	test("marks the messages in view, and the first of them as current", async () => {
		const user = userEvent.setup();
		render(<Chat turns={turnsWith(30)} />);

		await user.click(screen.getByRole("button", { name: "Conversation outline" }));

		// The view starts at the end, where only the last question's answer shows.
		expect(item("Add a rate limit.")).toHaveAttribute("aria-current", "location");
		expect(item("Add a rate limit.")).not.toHaveAttribute("data-in-view");
		expect(item("What's live?")).not.toHaveAttribute("aria-current");
		expect(item("Add a rate limit.")).toHaveFocus();
	});

	test("a press jumps to the message, moves focus to it, and the marks follow", async () => {
		const user = userEvent.setup();
		render(<Chat turns={turnsWith(30)} />);

		await user.click(screen.getByRole("button", { name: "Conversation outline" }));
		await user.click(item("Which endpoints have no policy?"));

		await waitFor(() => {
			expect(Math.abs(offsetInView("q1") - 16)).toBeLessThanOrEqual(2);
		});
		expect(document.getElementById("q1")).toHaveFocus();
		expect(screen.queryByRole("button", { name: "What's live?" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "Conversation outline" }));
		expect(item("Which endpoints have no policy?")).toHaveAttribute("aria-current", "location");
		expect(item("Which endpoints have no policy?")).toHaveAttribute("data-in-view");
		expect(item("Add a rate limit.")).not.toHaveAttribute("data-in-view");
	});

	test("a jump up while an answer streams stays at the message", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Chat turns={turnsWith(5)} />);

		await user.click(screen.getByRole("button", { name: "Conversation outline" }));
		await user.click(item("Which endpoints have no policy?"));
		// Why at once: a chunk that lands before the first scroll frame pulled the view back to the end.
		rerender(<Chat turns={turnsWith(10)} />);
		rerender(<Chat turns={turnsWith(20)} />);

		await waitFor(() => {
			expect(Math.abs(offsetInView("q1") - 16)).toBeLessThanOrEqual(2);
		});
		rerender(<Chat turns={turnsWith(40)} />);
		// Why two frames: the follow observers run after layout, before the next paint.
		await nextFrame();
		await nextFrame();
		expect(Math.abs(offsetInView("q1") - 16)).toBeLessThanOrEqual(2);
	});

	test("works by keyboard", async () => {
		const user = userEvent.setup();
		render(<Chat turns={turnsWith(30)} />);

		screen.getByRole("button", { name: "Conversation outline" }).focus();
		await user.keyboard("{Enter}");
		expect(item("Add a rate limit.")).toHaveFocus();
		await user.keyboard("{Shift>}{Tab}{/Shift}");
		expect(item("Which endpoints have no policy?")).toHaveFocus();
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(document.getElementById("q1")).toHaveFocus();
		});
		await user.keyboard("{Escape}");
		expect(screen.getByRole("button", { name: "Conversation outline" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});
});

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import * as Message from "../message/message-parts.js";
import * as Conversation from "./conversation-parts.js";

type Turn = { id: string; from: "user" | "assistant"; text: string };

// The tests load no Tailwind, so the viewport scrolls through inline styles.
const viewportStyle = { height: 200, overflowY: "auto" } as const;

const longAnswer = Array.from(
	{ length: 40 },
	(_, index) => `Line ${index + 1}: check the endpoint, then the policy.`,
).join("\n");

function Transcript({ turns }: { turns: Turn[] }) {
	return (
		<Conversation.Root>
			<Conversation.Viewport aria-label="Conversation" style={viewportStyle}>
				<Conversation.Content>
					{turns.map((turn) => (
						<Message.Root key={turn.id} from={turn.from}>
							<Message.Content style={{ whiteSpace: "pre-wrap" }}>{turn.text}</Message.Content>
						</Message.Root>
					))}
				</Conversation.Content>
			</Conversation.Viewport>
			<Conversation.ScrollButton />
		</Conversation.Root>
	);
}

/** Waits for the observers' first callbacks, which run after layout, as a reader's first scroll does. */
function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});
}

function viewport(): HTMLElement {
	return screen.getByRole("region", { name: "Conversation" });
}

function distanceFromEnd(element: HTMLElement): number {
	return element.scrollHeight - element.clientHeight - element.scrollTop;
}

function root(): HTMLElement {
	const element = viewport().closest('[data-slot="conversation"]');
	if (!(element instanceof HTMLElement)) {
		throw new Error("Conversation.Root did not render.");
	}
	return element;
}

const question: Turn = { id: "q1", from: "user", text: "Which endpoints have no traffic policy?" };

describe("Conversation", () => {
	test("mounts at the end of a long conversation", () => {
		render(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);

		expect(viewport().scrollTop).toBeGreaterThan(0);
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
		expect(root()).not.toHaveAttribute("data-scrolled-up");
	});

	test("follows the end while an answer streams", async () => {
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: "Line 1" }]} />,
		);

		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);

		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(viewport().scrollTop).toBeGreaterThan(0);
	});

	test("stays where the reader scrolled up while the answer grows, and shows the button", async () => {
		const half = longAnswer.slice(0, longAnswer.length / 2);
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: half }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 20, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));

		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await nextFrame();

		expect(viewport().scrollTop).toBe(20);
		expect(root()).toHaveAttribute("data-scrolled-up", "");
	});

	test("follows again after the reader scrolls back to the end", async () => {
		const half = longAnswer.slice(0, longAnswer.length / 2);
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: half }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 20, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));
		viewport().scrollTo({ top: viewport().scrollHeight, behavior: "instant" });
		await waitFor(() => expect(root()).not.toHaveAttribute("data-scrolled-up"));

		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);

		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("a new message from the person follows the end again", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[question, answer]} />);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));

		rerender(
			<Transcript
				turns={[question, answer, { id: "q2", from: "user", text: "And which have one?" }]}
			/>,
		);

		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(root()).not.toHaveAttribute("data-scrolled-up");
	});

	test("a new assistant message does not move a reader who scrolled up", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[question, answer]} />);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));

		rerender(
			<Transcript
				turns={[question, answer, { id: "a2", from: "assistant", text: "One more thing." }]}
			/>,
		);
		await nextFrame();

		expect(viewport().scrollTop).toBe(0);
	});

	test("the scroll button goes to the end, follows again, and moves focus to the viewport", async () => {
		const user = userEvent.setup();
		const half = longAnswer.slice(0, longAnswer.length / 2);
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: half }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));

		await user.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(viewport()).toHaveFocus();

		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(root()).not.toHaveAttribute("data-scrolled-up");
	});
});

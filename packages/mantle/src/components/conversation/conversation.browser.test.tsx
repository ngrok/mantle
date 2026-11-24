import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type Ref } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { commands, userEvent as browserUser } from "vitest/browser";
import { type ScrollAnchor, useScrollAnchor } from "../../hooks/use-scroll-anchor.js";
import * as Message from "../message/message-parts.js";
import * as Conversation from "./conversation-parts.js";

type Turn = { id: string; from: "user" | "assistant"; text: string };

// The tests load no Tailwind, so the viewport scrolls through inline styles.
const viewportStyle = { height: 200, overflowY: "auto" } as const;

const longAnswer = Array.from(
	{ length: 40 },
	(_, index) => `Line ${index + 1}: check the endpoint, then the policy.`,
).join("\n");

function Transcript({
	turns,
	contentRef,
	viewportRef,
	label = "Conversation",
}: {
	turns: Turn[];
	contentRef?: Ref<HTMLOListElement>;
	viewportRef?: Ref<HTMLDivElement>;
	label?: string;
}) {
	return (
		<Conversation.Root>
			<Conversation.Viewport ref={viewportRef} aria-label={label} style={viewportStyle}>
				<Conversation.Content ref={contentRef}>
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

	test.each(["reduce", "no-preference"] as const)(
		"the scroll button follows and focuses with %s motion",
		async (reducedMotion) => {
			await commands.emulateMedia({ reducedMotion });
			const user = userEvent.setup();
			const half = longAnswer.slice(0, longAnswer.length / 2);
			const { rerender } = render(
				<Transcript turns={[question, { id: "a1", from: "assistant", text: half }]} />,
			);
			await nextFrame();
			viewport().scrollTo({ top: 0, behavior: "instant" });
			await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));
			viewport().style.scrollBehavior = "smooth";

			await user.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
			const immediateDistance = distanceFromEnd(viewport());
			expect(reducedMotion !== "reduce" || immediateDistance <= 1).toBe(true);
			await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
			expect(viewport()).toHaveFocus();

			rerender(
				<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
			);
			await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
			expect(root()).not.toHaveAttribute("data-scrolled-up");
		},
	);

	test("a new viewport ref preserves following and a reader's place", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript viewportRef={() => {}} turns={[question, answer]} />);
		await nextFrame();
		rerender(
			<Transcript
				viewportRef={() => {}}
				turns={[question, { ...answer, text: longAnswer.repeat(2) }]}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));

		rerender(
			<Transcript
				viewportRef={() => {}}
				turns={[question, { ...answer, text: longAnswer.repeat(3) }]}
			/>,
		);
		await nextFrame();
		await nextFrame();
		expect(viewport().scrollTop).toBe(0);
		expect(root()).toHaveAttribute("data-scrolled-up");
	});

	test("prepending history does not follow, but appending a user and answer does", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[question, answer]} />);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		const history = [{ ...question, id: "older" }, question, answer];
		rerender(<Transcript turns={history} />);
		await nextFrame();
		await nextFrame();
		expect(root()).toHaveAttribute("data-scrolled-up");
		expect(distanceFromEnd(viewport())).toBeGreaterThan(100);

		rerender(
			<Transcript turns={[...history, { ...question, id: "q2" }, { ...answer, id: "a2" }]} />,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("an upward wheel over a fitting transcript does not stop following", async () => {
		const { rerender } = render(<Transcript turns={[question]} />);
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBe(0);
		viewport().dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("a restored fitting transcript follows when it grows", async () => {
		const anchorRef = createRef<ScrollAnchor>();
		function RestoredTranscript({ text }: { text: string }) {
			const contentRef = useScrollAnchor({ anchorRef });
			return <Transcript contentRef={contentRef} turns={[{ id: "a1", from: "assistant", text }]} />;
		}
		const { rerender } = render(<RestoredTranscript key="page" text="Short answer" />);
		await nextFrame();
		rerender(<RestoredTranscript key="panel" text="Short answer" />);
		await nextFrame();
		rerender(<RestoredTranscript key="panel" text={longAnswer} />);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("the button becomes inert and returns focus before content shrink hides it", async () => {
		const { rerender } = render(
			<Transcript turns={[{ id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		const button = screen.getByRole("button", { name: "Scroll to the latest message" });
		expect(button).not.toHaveAttribute("inert");
		button.focus();
		expect(button).toHaveFocus();

		rerender(<Transcript turns={[{ id: "a1", from: "assistant", text: "Short answer" }]} />);
		await waitFor(() => expect(button).toHaveAttribute("inert"));
		expect(viewport()).toHaveFocus();
		await browserUser.keyboard("{Tab}");
		expect(button).not.toHaveFocus();
	});

	test("hydrates without scrolled-up state and retains it across later renders", async () => {
		const turns: Turn[] = [question, { id: "a1", from: "assistant", text: longAnswer }];
		const container = document.createElement("div");
		container.innerHTML = renderToString(<Transcript turns={turns} />);
		document.body.append(container);
		expect(root()).not.toHaveAttribute("data-scrolled-up");
		const { rerender } = render(<Transcript turns={turns} />, { container, hydrate: true });
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
		viewport().scrollTo({ top: 25, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));

		rerender(<Transcript turns={turns} label="Renamed conversation" />);
		const renamed = screen.getByRole("region", { name: "Renamed conversation" });
		expect(renamed.scrollTop).toBe(25);
		expect(renamed.closest('[data-slot="conversation"]')).toHaveAttribute("data-scrolled-up");
	});

	test("a new user message in one conversation does not move its neighbor", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(
			<>
				<Transcript turns={[question, answer]} />
				<Transcript turns={[question, answer]} label="Other model" />
			</>,
		);
		await nextFrame();
		const other = screen.getByRole("region", { name: "Other model" });
		viewport().scrollTo({ top: 25, behavior: "instant" });
		other.scrollTo({ top: 50, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));

		rerender(
			<>
				<Transcript turns={[question, answer]} />
				<Transcript turns={[question, answer, { ...question, id: "q2" }]} label="Other model" />
			</>,
		);
		await waitFor(() => expect(distanceFromEnd(other)).toBeLessThanOrEqual(1));
		expect(viewport().scrollTop).toBe(25);
		expect(root()).toHaveAttribute("data-scrolled-up");
		expect(other.closest('[data-slot="conversation"]')).not.toHaveAttribute("data-scrolled-up");
	});

	test.each([0, 40])("restores a place at %i and shows the scroll button", async (top) => {
		const anchorRef = createRef<ScrollAnchor>();
		function RestoredTranscript() {
			const contentRef = useScrollAnchor({ anchorRef });
			return (
				<Transcript
					contentRef={contentRef}
					turns={[question, { id: "a1", from: "assistant", text: longAnswer }]}
				/>
			);
		}
		const { rerender } = render(<RestoredTranscript key="page" />);
		await nextFrame();
		viewport().scrollTo({ top, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));

		rerender(<RestoredTranscript key="panel" />);
		await nextFrame();

		expect(viewport().scrollTop).toBeCloseTo(top, 0);
		expect(root()).toHaveAttribute("data-scrolled-up", "");
	});

	test("keeps following when content above the end shrinks", async () => {
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.slice(0, 1000) }]}
			/>,
		);
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
		rerender(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
	});

	test("stream updates do not jump to the end during the button's smooth scroll", async () => {
		await commands.emulateMedia({ reducedMotion: "no-preference" });
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		await browserUser.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
		await waitFor(() => expect(viewport().scrollTop).toBeGreaterThan(20));
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer + " more" }]}
			/>,
		);
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeGreaterThan(100);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("a scroll up interrupts the button before it reaches the end", async () => {
		await commands.emulateMedia({ reducedMotion: "no-preference" });
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		await browserUser.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
		await waitFor(() => expect(viewport().scrollTop).toBeGreaterThan(60));
		expect(distanceFromEnd(viewport())).toBeGreaterThan(100);
		const interruptedTop = viewport().scrollTop - 20;
		viewport().scrollTo({ top: interruptedTop, behavior: "instant" });
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer + "\nMore" }]}
			/>,
		);
		await nextFrame();

		expect(viewport().scrollTop).toBe(interruptedTop);
		expect(root()).toHaveAttribute("data-scrolled-up");
	});

	test("PageUp releases the view before another stream update", async () => {
		render(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await nextFrame();
		const initialTop = viewport().scrollTop;
		viewport().focus();
		const content = screen.getAllByRole("listitem").at(-1);
		if (content == null) {
			throw new Error("The answer did not render.");
		}
		let streaming = true;
		const stream = () => {
			if (streaming) {
				content.append(" more");
				requestAnimationFrame(stream);
			}
		};
		requestAnimationFrame(stream);
		try {
			await browserUser.keyboard("{PageUp}");
			await waitFor(() => expect(viewport().scrollTop).toBeLessThan(initialTop - 50));
			expect(root()).toHaveAttribute("data-scrolled-up");
		} finally {
			streaming = false;
		}
	});
});

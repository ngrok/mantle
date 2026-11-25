import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type ReactNode, type Ref, StrictMode } from "react";
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
	width,
	height = viewportStyle.height,
	label = "Conversation",
	children,
	actions,
}: {
	turns: Turn[];
	contentRef?: Ref<HTMLDivElement>;
	viewportRef?: Ref<HTMLDivElement>;
	width?: number;
	height?: number;
	label?: string;
	children?: ReactNode;
	/** Rendered in the newest message, such as a copy button. */
	actions?: ReactNode;
}) {
	return (
		<Conversation.Root>
			<Conversation.Viewport ref={viewportRef} style={{ ...viewportStyle, width, height }}>
				<Conversation.Content ref={contentRef} aria-label={label}>
					{turns.map((turn, index) => (
						<Message.Root key={turn.id} from={turn.from}>
							<Message.Content style={{ whiteSpace: "pre-wrap" }}>{turn.text}</Message.Content>
							{index === turns.length - 1 && actions}
						</Message.Root>
					))}
					{children}
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

/** The viewport around the feed named `name`. */
function viewport(name = "Conversation"): HTMLElement {
	const element = screen
		.getByRole("feed", { name })
		.closest<HTMLElement>('[data-slot~="conversation-viewport"]');
	if (element == null) {
		throw new Error("Conversation.Viewport did not render.");
	}
	return element;
}

/** The messages, oldest first. */
function messages(): HTMLElement[] {
	return screen.getAllByRole("article");
}

/** The message at `index`, from the end when negative. */
function message(index: number): HTMLElement {
	const element = messages().at(index);
	if (element == null) {
		throw new Error(`No message at ${index}.`);
	}
	return element;
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
			expect(messages().at(-1)).toHaveFocus();

			rerender(
				<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
			);
			await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
			expect(root()).not.toHaveAttribute("data-scrolled-up");
		},
	);

	test.each(["no-preference", "reduce"] as const)(
		"the scroll button grows in and out with %s motion",
		async (reducedMotion) => {
			await commands.emulateMedia({ reducedMotion });
			// Why compiled CSS: the browser project loads no Tailwind stylesheet.
			const css = await commands.tailwindCss("./conversation.tsx");
			render(
				<>
					{/* Why the root height: the compiled `flex-1` makes the viewport's height a flex basis of 0. */}
					<style>{`${css}\n[data-slot~="conversation"] { height: 200px; }`}</style>
					<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />
				</>,
			);
			await nextFrame();
			// Why a slot query: the hidden button is inert, so it has no accessible role yet.
			const button = root().querySelector<HTMLButtonElement>(
				'[data-slot~="conversation-scroll-button"]',
			);
			if (button == null) {
				throw new Error("Conversation.ScrollButton did not render.");
			}
			const settled = () => button.getAnimations().length === 0;
			const style = () => getComputedStyle(button);

			viewport().scrollTo({ top: 0, behavior: "instant" });
			await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up", ""));
			expect(button.inert).toBe(false);
			expect(settled()).toBe(reducedMotion === "reduce");
			await waitFor(() => expect(settled()).toBe(true));
			expect(style().opacity).toBe("1");
			expect(style().scale).toBe("1");
			expect(style().visibility).toBe("visible");

			viewport().scrollTo({ top: viewport().scrollHeight, behavior: "instant" });
			await waitFor(() => expect(root()).not.toHaveAttribute("data-scrolled-up"));
			// Why: the button leaves the tab order at once, while it still fades out.
			expect(button.inert).toBe(true);
			// Why: with motion, the exit still shows; reduced motion hides the button at once.
			expect(settled()).toBe(reducedMotion === "reduce");
			expect(style().visibility).toBe(reducedMotion === "reduce" ? "hidden" : "visible");
			await waitFor(() => expect(settled()).toBe(true));
			expect(style().opacity).toBe("0");
			expect(style().visibility).toBe("hidden");
		},
	);

	test("Tab lands on the newest message, which alone draws the ring, and only from the keyboard", async () => {
		// Why compiled CSS: the browser project loads no Tailwind stylesheet.
		const css = await commands.tailwindCss("../message/message.tsx");
		render(
			<>
				<style>{css}</style>
				<button type="button">Before</button>
				<Transcript turns={[question, { id: "a1", from: "assistant", text: "Two have none." }]} />
				<button type="button">After</button>
			</>,
		);
		await nextFrame();
		const first = message(0);
		const newest = message(-1);
		const ring = (element: HTMLElement) => getComputedStyle(element).boxShadow;

		await browserUser.click(screen.getByRole("button", { name: "Before" }));
		await browserUser.keyboard("{Tab}");
		expect(newest).toHaveFocus();
		expect(ring(newest)).not.toBe("none");
		expect(ring(first)).toBe("none");
		expect(ring(root())).toBe("none");
		await browserUser.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

		// Why: a pointer press focuses the message without :focus-visible, so no ring shows.
		await browserUser.click(first);
		expect(first).toHaveFocus();
		expect(ring(first)).toBe("none");
	});

	test("Up and Down move focus between messages, and the tab stop stays on the one the reader chose", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		render(
			<>
				<button type="button">Before</button>
				<Transcript turns={[question, answer, { ...question, id: "q2" }]} />
			</>,
		);
		await nextFrame();
		const first = message(0);
		const second = message(1);
		const newest = message(2);
		expect(messages().map((message) => message.getAttribute("aria-posinset"))).toEqual([
			"1",
			"2",
			"3",
		]);
		expect(newest).toHaveAttribute("aria-setsize", "3");
		newest.focus();

		await browserUser.keyboard("{ArrowUp}");
		expect(second).toHaveFocus();
		await browserUser.keyboard("{ArrowUp}");
		expect(first).toHaveFocus();
		// Why: the first message sits at the top of the view, below no fade.
		expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			viewport().getBoundingClientRect().top - 1,
		);
		await browserUser.keyboard("{ArrowUp}");
		expect(first).toHaveFocus();

		await browserUser.keyboard("{ArrowDown}");
		expect(second).toHaveFocus();
		expect(second.tabIndex).toBe(0);
		expect(newest.tabIndex).toBe(-1);
		await browserUser.click(screen.getByRole("button", { name: "Before" }));
		await browserUser.keyboard("{Tab}");
		expect(second).toHaveFocus();
	});

	test("Page Up and Page Down scroll the viewport from a focused message", async () => {
		render(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await nextFrame();
		const newest = messages().at(-1);
		newest?.focus({ preventScroll: true });
		const top = viewport().scrollTop;
		await browserUser.keyboard("{PageUp}");
		await waitFor(() => expect(viewport().scrollTop).toBeLessThan(top - 50));
		expect(newest).toHaveFocus();
		// Why: WebKit scrolls a page smoothly, so read the place once it stops.
		let pagedUp = Number.NaN;
		await waitFor(async () => {
			const before = viewport().scrollTop;
			await nextFrame();
			await nextFrame();
			pagedUp = viewport().scrollTop;
			expect(pagedUp).toBe(before);
		});
		await browserUser.keyboard("{PageDown}");
		await waitFor(() => expect(viewport().scrollTop).toBeGreaterThan(pagedUp + 50));
		expect(newest).toHaveFocus();
	});

	test("Control+End and Control+Home leave the conversation for its neighbors", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Transcript turns={[question, { id: "a1", from: "assistant", text: "Two have none." }]} />
				<textarea aria-label="Message the assistant" />
			</>,
		);
		await nextFrame();
		messages()[0]?.focus();
		await browserUser.keyboard("{Control>}{End}{/Control}");
		expect(screen.getByRole("textbox", { name: "Message the assistant" })).toHaveFocus();
		messages()[0]?.focus();
		await browserUser.keyboard("{Control>}{Home}{/Control}");
		expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
	});

	test("a focused newest message keeps following while it streams, and a button in it keeps focus", async () => {
		const { rerender } = render(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: "Line 1" }]}
				actions={<button type="button">Copy</button>}
			/>,
		);
		await nextFrame();
		const copy = screen.getByRole("button", { name: "Copy" });
		copy.focus();
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer }]}
				actions={<button type="button">Copy</button>}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(copy).toHaveFocus();

		messages().at(-1)?.focus();
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.repeat(2) }]}
				actions={<button type="button">Copy</button>}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(messages().at(-1)).toHaveFocus();
	});

	test("a removed focused message hands focus to the new tab stop", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: "Two have none." };
		const { rerender } = render(<Transcript turns={[question, answer]} />);
		await nextFrame();
		messages().at(-1)?.focus();
		rerender(<Transcript turns={[question, { ...answer, id: "a1-retry" }]} />);
		await waitFor(() => expect(messages().at(-1)).toHaveFocus());
	});

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
		expect(messages().at(-1)).toHaveFocus();
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
		const renamed = viewport("Renamed conversation");
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
		const other = viewport("Other model");
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
		const turns: Turn[] = [question, { id: "a1", from: "assistant", text: longAnswer }];
		function RestoredTranscript({ turns }: { turns: Turn[] }) {
			const contentRef = useScrollAnchor({ anchorRef });
			return <Transcript contentRef={contentRef} turns={turns} />;
		}
		const { rerender } = render(
			<StrictMode>
				<RestoredTranscript key="page" turns={turns} />
			</StrictMode>,
		);
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
		viewport().scrollTo({ top, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));

		rerender(
			<StrictMode>
				<RestoredTranscript key="panel" turns={turns} />
			</StrictMode>,
		);
		await nextFrame();

		expect(viewport().scrollTop).toBeCloseTo(top, 0);
		expect(root()).toHaveAttribute("data-scrolled-up", "");
		rerender(
			<StrictMode>
				<RestoredTranscript key="panel" turns={[...turns, { ...question, id: "q2" }]} />
			</StrictMode>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("a restored place survives a wide mount that temporarily fits all the text", async () => {
		const anchorRef = createRef<ScrollAnchor>();
		function RestoredTranscript({ width }: { width: number }) {
			const contentRef = useScrollAnchor({ anchorRef });
			return (
				<Transcript
					width={width}
					contentRef={contentRef}
					turns={[{ id: "a1", from: "assistant", text: "word ".repeat(160) }]}
				/>
			);
		}
		const { rerender } = render(<RestoredTranscript key="page" width={380} />);
		await nextFrame();
		viewport().scrollTo({ top: 40, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		// Wide enough that the text fits in every engine's default font.
		rerender(<RestoredTranscript key="panel" width={1600} />);
		await nextFrame();
		expect(viewport().scrollTop).toBe(0);
		expect(distanceFromEnd(viewport())).toBe(0);

		rerender(<RestoredTranscript key="panel" width={380} />);
		await waitFor(() => expect(viewport().scrollTop).toBeCloseTo(40, 0));
		expect(root()).toHaveAttribute("data-scrolled-up");
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

		rerender(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: "Short answer" }]} />,
		);
		expect(viewport().scrollTop).toBe(0);
		await Promise.resolve();
		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.repeat(2) }]}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
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

	test("ArrowDown during the button's smooth scroll does not strand following", async () => {
		await commands.emulateMedia({ reducedMotion: "no-preference" });
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		await browserUser.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
		await waitFor(() => expect(viewport().scrollTop).toBeGreaterThan(20));
		await browserUser.keyboard("{ArrowDown}");
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));

		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.repeat(2) }]}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("an upward wheel that a nested scroller takes does not stop following", async () => {
		const nested = Array.from({ length: 20 }, (_, index) => `Row ${index + 1}`).join("\n");
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		const table = document.createElement("div");
		Object.assign(table.style, { maxHeight: "40px", overflowY: "auto", whiteSpace: "pre" });
		table.textContent = nested;
		message(-1).append(table);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		table.scrollTop = 30;
		table.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true }));
		viewport().dispatchEvent(new WheelEvent("wheel", { deltaY: -100, ctrlKey: true }));

		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.repeat(2) }]}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		expect(root()).not.toHaveAttribute("data-scrolled-up");
	});

	test("a wheel down during the button's smooth scroll does not strand following", async () => {
		await commands.emulateMedia({ reducedMotion: "no-preference" });
		const { rerender } = render(
			<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />,
		);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		await browserUser.click(screen.getByRole("button", { name: "Scroll to the latest message" }));
		await waitFor(() => expect(viewport().scrollTop).toBeGreaterThan(20));
		viewport().dispatchEvent(new WheelEvent("wheel", { deltaY: 10 }));
		viewport().scrollTo({ top: viewport().scrollTop + 5, behavior: "instant" });
		await nextFrame();
		viewport().dispatchEvent(new Event("scrollend"));

		rerender(
			<Transcript
				turns={[question, { id: "a1", from: "assistant", text: longAnswer.repeat(2) }]}
			/>,
		);
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
	});

	test("unmounting the viewport clears the scrolled-up state", async () => {
		function Switching({ loading }: { loading: boolean }) {
			return (
				<Conversation.Root>
					{loading ? (
						<p>Loading…</p>
					) : (
						<Conversation.Viewport style={viewportStyle}>
							<Conversation.Content aria-label="Conversation">
								<Message.Root from="assistant">
									<Message.Content style={{ whiteSpace: "pre-wrap" }}>{longAnswer}</Message.Content>
								</Message.Root>
							</Conversation.Content>
						</Conversation.Viewport>
					)}
					<Conversation.ScrollButton />
				</Conversation.Root>
			);
		}
		const { container, rerender } = render(<Switching loading={false} />);
		await nextFrame();
		viewport().scrollTo({ top: 0, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		const conversation = root();

		rerender(<Switching loading />);

		expect(conversation).not.toHaveAttribute("data-scrolled-up");
		expect(container.querySelector('[data-slot~="conversation-scroll-button"]')).toHaveAttribute(
			"inert",
		);
	});

	test("PageUp releases the view before another stream update", async () => {
		render(<Transcript turns={[question, { id: "a1", from: "assistant", text: longAnswer }]} />);
		await nextFrame();
		const initialTop = viewport().scrollTop;
		const content = messages().at(-1);
		content?.focus({ preventScroll: true });
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
	test("follows the next update after a taller viewport pulls the reader to the end", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[answer]} />);
		await nextFrame();
		viewport().scrollTo({ top: viewport().scrollTop - 100, behavior: "instant" });
		await waitFor(() => expect(root()).toHaveAttribute("data-scrolled-up"));
		// Why: the prompt input shrinks after a send, or the window grows.
		rerender(<Transcript turns={[answer]} height={400} />);
		await waitFor(() => expect(root()).not.toHaveAttribute("data-scrolled-up"));
		rerender(
			<Transcript
				turns={[{ ...answer, text: `${longAnswer}\nMore 1\nMore 2\nMore 3` }]}
				height={400}
			/>,
		);
		await nextFrame();
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
	});

	test.each([
		{
			name: "an ArrowUp a React handler takes",
			key: "{ArrowUp}",
			extra: (
				<li>
					<button
						type="button"
						onKeyDown={(event) => event.key === "ArrowUp" && event.preventDefault()}
					>
						Option
					</button>
				</li>
			),
			target: () => screen.getByRole("button", { name: "Option" }),
		},
		{
			name: "an ArrowUp a nested scroller takes",
			key: "{ArrowUp}",
			extra: (
				<li>
					<pre
						data-testid="nested"
						// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Why: a focusable scroller, as a code block is.
						tabIndex={0}
						style={{ maxHeight: 40, overflowY: "auto", margin: 0 }}
					>
						{Array.from({ length: 20 }, (_, index) => `Row ${index + 1}`).join("\n")}
					</pre>
				</li>
			),
			target: () => {
				const pre = screen.getByTestId("nested");
				pre.scrollTop = 100;
				return pre;
			},
		},
		{
			name: "a Shift+Space that presses a button",
			key: "{Shift>} {/Shift}",
			extra: (
				<li>
					<button type="button">Copy</button>
				</li>
			),
			target: () => screen.getByRole("button", { name: "Copy" }),
		},
	])("keeps following after $name", async ({ key, extra, target }) => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[answer]}>{extra}</Transcript>);
		await nextFrame();
		target().focus({ preventScroll: true });
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		const top = viewport().scrollTop;
		await browserUser.keyboard(key);
		await nextFrame();
		expect(viewport().scrollTop).toBe(top);
		rerender(
			<Transcript turns={[{ ...answer, text: `${longAnswer}\nMore 1\nMore 2\nMore 3` }]}>
				{extra}
			</Transcript>,
		);
		await nextFrame();
		await nextFrame();
		expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1);
		expect(root()).not.toHaveAttribute("data-scrolled-up");
	});

	test("stays released after a wheel up of 1 px", async () => {
		const answer: Turn = { id: "a1", from: "assistant", text: longAnswer };
		const { rerender } = render(<Transcript turns={[answer]} />);
		await nextFrame();
		await waitFor(() => expect(distanceFromEnd(viewport())).toBeLessThanOrEqual(1));
		const top = viewport().scrollTop;
		viewport().dispatchEvent(
			new WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: true }),
		);
		viewport().scrollTo({ top: top - 1, behavior: "instant" });
		await nextFrame();
		rerender(<Transcript turns={[{ ...answer, text: `${longAnswer}\nMore 1\nMore 2\nMore 3` }]} />);
		await nextFrame();
		await nextFrame();
		expect(viewport().scrollTop).toBe(top - 1);
	});
});

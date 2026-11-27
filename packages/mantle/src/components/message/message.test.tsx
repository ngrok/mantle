import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Message from "./message-parts.js";

describe("Message", () => {
	test("renders articles that say who wrote each message", () => {
		render(
			<div role="feed" aria-label="Messages">
				<Message.Root from="user">
					<Message.Content>{"What's live?"}</Message.Content>
				</Message.Root>
				<Message.Root from="assistant">
					<Message.Content>Three endpoints.</Message.Content>
				</Message.Root>
			</div>,
		);

		// Why the names: the feed pattern names each article, here by its speaker label.
		const question = screen.getByRole("article", { name: "You said:" });
		const answer = screen.getByRole("article", { name: "The assistant said:" });
		expect(question).toHaveAttribute("data-from", "user");
		expect(question).not.toHaveAttribute("aria-label");
		expect(question).toHaveTextContent("You said: What's live?");
		expect(answer).toHaveAttribute("data-from", "assistant");
		expect(answer).toHaveTextContent("The assistant said: Three endpoints.");
	});

	test("speaker replaces the hidden label and the article's name, and from keeps the layout", () => {
		render(
			<div role="feed" aria-label="Messages">
				<Message.Root from="assistant" speaker="Error">
					<Message.Content>Quota exceeded.</Message.Content>
				</Message.Root>
				<Message.Root from="user" speaker="The caller said:">
					<Message.Content>Hi</Message.Content>
				</Message.Root>
			</div>,
		);

		const error = screen.getByRole("article", { name: "Error" });
		expect(error).toHaveAttribute("data-from", "assistant");
		expect(error).toHaveTextContent("Error Quota exceeded.");
		expect(error).not.toHaveTextContent("The assistant said:");
		const caller = screen.getByRole("article", { name: "The caller said:" });
		expect(caller).toHaveAttribute("data-from", "user");
		expect(caller).not.toHaveTextContent("You said:");
	});

	test("speaker names a message that has no Content, and aria-label still wins", () => {
		render(
			<div role="feed" aria-label="Messages">
				<Message.Root from="user" speaker="The caller said:">
					<img src="chart.png" alt="Traffic chart" width={320} height={180} />
				</Message.Root>
				<Message.Root from="assistant" speaker="Tool result" aria-label="Endpoint list">
					<img src="list.png" alt="Endpoints" width={320} height={180} />
				</Message.Root>
			</div>,
		);

		// Why: with no `Message.Content`, no hidden label exists for the article to point at.
		expect(screen.getByRole("article", { name: "The caller said:" })).toHaveAttribute(
			"data-from",
			"user",
		);
		expect(screen.getByRole("article", { name: "Endpoint list" })).toHaveAttribute(
			"data-from",
			"assistant",
		);
	});

	test("each part forwards className, ref, and data attributes, and joins data-slot", () => {
		const ref = vi.fn<(node: HTMLElement | null) => void>();
		const { container } = render(
			<div role="feed">
				<Message.Root ref={ref} from="assistant" className="root-class" data-slot="outer">
					<Message.Content className="content-class">Done.</Message.Content>
					<Message.Pending className="pending-class">Thinking…</Message.Pending>
					<Message.Actions className="actions-class" data-testid="actions" />
				</Message.Root>
			</div>,
		);

		const item = screen.getByRole("article");
		expect(ref).toHaveBeenLastCalledWith(item);
		expect(item).toHaveClass("root-class");
		expect(item).toHaveAttribute("data-slot", "outer message");
		expect(container.querySelector('[data-slot="message-content"]')).toHaveClass("content-class");
		expect(container.querySelector('[data-slot="message-pending"]')).toHaveClass("pending-class");
		expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "message-actions");
	});

	test("Root with asChild renders the child and merges props", () => {
		const ref = vi.fn<(node: HTMLElement | null) => void>();
		render(
			<div role="feed">
				<Message.Root asChild ref={ref} from="user" className="root-class">
					<article className="child-class">
						<Message.Content>Hi</Message.Content>
					</article>
				</Message.Root>
			</div>,
		);

		const item = screen.getByRole("article");
		expect(item).toHaveClass("root-class", "child-class");
		expect(item).toHaveAttribute("data-slot", "message");
		expect(item).toHaveAttribute("data-from", "user");
		expect(ref).toHaveBeenLastCalledWith(item);
	});

	test("Content and Pending survive a translated page when their text changes", () => {
		const { container, rerender } = render(
			<div role="feed">
				<Message.Root from="assistant">
					<Message.Content>Checking endpoints</Message.Content>
					<Message.Pending>Thinking…</Message.Pending>
				</Message.Root>
			</div>,
		);
		translateTextNodes(container);

		rerender(
			<div role="feed">
				<Message.Root from="assistant">
					<Message.Content>
						<strong>Three</strong> endpoints
					</Message.Content>
					<Message.Pending>Calling a tool…</Message.Pending>
				</Message.Root>
			</div>,
		);

		expect(screen.getByRole("article")).toHaveTextContent("Three endpoints");
		expect(screen.getByRole("article")).toHaveTextContent("Calling a tool…");
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Message.Content>Hi</Message.Content>)).toThrow(
			"Message.Content must be rendered inside Message.Root.",
		);
	});
});

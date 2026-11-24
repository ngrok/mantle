import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Message from "./message-parts.js";

describe("Message", () => {
	test("renders list items that say who wrote each message", () => {
		render(
			<ol aria-label="Messages">
				<Message.Root from="user">
					<Message.Content>{"What's live?"}</Message.Content>
				</Message.Root>
				<Message.Root from="assistant">
					<Message.Content>Three endpoints.</Message.Content>
				</Message.Root>
			</ol>,
		);

		const [question, answer] = screen.getAllByRole("listitem");
		expect(question).toHaveAttribute("data-from", "user");
		expect(question).toHaveTextContent("You said: What's live?");
		expect(answer).toHaveAttribute("data-from", "assistant");
		expect(answer).toHaveTextContent("The assistant said: Three endpoints.");
	});

	test("each part forwards className, ref, and data attributes, and joins data-slot", () => {
		const ref = vi.fn<(node: HTMLLIElement | null) => void>();
		const { container } = render(
			<ol>
				<Message.Root ref={ref} from="assistant" className="root-class" data-slot="outer">
					<Message.Content className="content-class">Done.</Message.Content>
					<Message.Pending className="pending-class">Thinking…</Message.Pending>
					<Message.Actions className="actions-class" data-testid="actions" />
				</Message.Root>
			</ol>,
		);

		const item = screen.getByRole("listitem");
		expect(ref).toHaveBeenLastCalledWith(item);
		expect(item).toHaveClass("root-class");
		expect(item).toHaveAttribute("data-slot", "outer message");
		expect(container.querySelector('[data-slot="message-content"]')).toHaveClass("content-class");
		expect(container.querySelector('[data-slot="message-pending"]')).toHaveClass("pending-class");
		expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "message-actions");
	});

	test("Root with asChild renders the child and merges props", () => {
		const ref = vi.fn<(node: HTMLLIElement | null) => void>();
		render(
			<ol>
				<Message.Root asChild ref={ref} from="user" className="root-class">
					<li className="child-class">
						<Message.Content>Hi</Message.Content>
					</li>
				</Message.Root>
			</ol>,
		);

		const item = screen.getByRole("listitem");
		expect(item).toHaveClass("root-class", "child-class");
		expect(item).toHaveAttribute("data-slot", "message");
		expect(item).toHaveAttribute("data-from", "user");
		expect(ref).toHaveBeenLastCalledWith(item);
	});

	test("Content and Pending survive a translated page when their text changes", () => {
		const { container, rerender } = render(
			<ol>
				<Message.Root from="assistant">
					<Message.Content>Checking endpoints</Message.Content>
					<Message.Pending>Thinking…</Message.Pending>
				</Message.Root>
			</ol>,
		);
		translateTextNodes(container);

		rerender(
			<ol>
				<Message.Root from="assistant">
					<Message.Content>
						<strong>Three</strong> endpoints
					</Message.Content>
					<Message.Pending>Calling a tool…</Message.Pending>
				</Message.Root>
			</ol>,
		);

		expect(screen.getByRole("listitem")).toHaveTextContent("Three endpoints");
		expect(screen.getByRole("listitem")).toHaveTextContent("Calling a tool…");
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Message.Content>Hi</Message.Content>)).toThrow(
			"Message.Content must be rendered inside Message.Root.",
		);
	});
});

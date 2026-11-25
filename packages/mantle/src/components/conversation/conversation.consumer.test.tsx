import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as Message from "../message/message-parts.js";
import * as Conversation from "./conversation-parts.js";

test.each([
	{ name: "plain jsdom", stub: false },
	{ name: "a stubbed ResizeObserver", stub: true },
])("a consumer renders a transcript in $name and finds its message by role", ({ stub }) => {
	if (stub) {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
	}
	render(
		<Conversation.Root>
			<Conversation.Viewport>
				<Conversation.Content aria-label="Conversation">
					<Message.Root from="user">
						<Message.Content>Which endpoints have no traffic policy?</Message.Content>
					</Message.Root>
				</Conversation.Content>
			</Conversation.Viewport>
			<Conversation.ScrollButton />
		</Conversation.Root>,
	);

	const message = screen.getByRole("article");
	expect(screen.getByRole("feed", { name: "Conversation" })).toContainElement(message);
	expect(message).toHaveTextContent("Which endpoints have no traffic policy?");
	// Why: a consumer's keyboard test tabs to the newest message with no layout.
	expect(message).toHaveAttribute("tabindex", "0");
});

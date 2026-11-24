import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as Message from "../message/message-parts.js";
import * as Conversation from "./conversation-parts.js";

test.each([
	{ name: "plain jsdom", stub: false },
	{ name: "a stubbed ResizeObserver", stub: true },
])("a consumer renders a transcript in $name and finds it by role", ({ stub }) => {
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
			<Conversation.Viewport aria-label="Conversation">
				<Conversation.Content>
					<Message.Root from="user">
						<Message.Content>Which endpoints have no traffic policy?</Message.Content>
					</Message.Root>
				</Conversation.Content>
			</Conversation.Viewport>
			<Conversation.ScrollButton />
		</Conversation.Root>,
	);

	expect(screen.getByRole("region", { name: "Conversation" })).toHaveTextContent(
		"Which endpoints have no traffic policy?",
	);
});

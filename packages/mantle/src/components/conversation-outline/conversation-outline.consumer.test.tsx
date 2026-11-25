import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Conversation from "../conversation/conversation-parts.js";
import * as Message from "../message/message-parts.js";
import * as ConversationOutline from "./conversation-outline-parts.js";

test("in plain jsdom, an item press closes the outline and focuses its message", async () => {
	const user = userEvent.setup();
	render(
		<>
			<ConversationOutline.Root>
				<ConversationOutline.Trigger />
				<ConversationOutline.Content>
					<ConversationOutline.Item target="q1">What is live?</ConversationOutline.Item>
				</ConversationOutline.Content>
			</ConversationOutline.Root>
			<Conversation.Root>
				<Conversation.Viewport>
					<Conversation.Content aria-label="Conversation">
						<Message.Root id="q1" from="user">
							<Message.Content>What is live?</Message.Content>
						</Message.Root>
					</Conversation.Content>
				</Conversation.Viewport>
			</Conversation.Root>
		</>,
	);

	await user.click(screen.getByRole("button", { name: "Conversation outline" }));
	await user.click(screen.getByRole("button", { name: "What is live?" }));

	expect(screen.getByRole("button", { name: "Conversation outline" })).toHaveAttribute(
		"aria-expanded",
		"false",
	);
	expect(document.getElementById("q1")).toHaveFocus();
});

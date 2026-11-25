import { Card } from "@ngrok/mantle/card";
import { Conversation } from "@ngrok/mantle/conversation";
import { ConversationOutline } from "@ngrok/mantle/conversation-outline";
import { Message } from "@ngrok/mantle/message";

import { PreviewCanvas } from "~/components/preview-canvas";

type Turn = { id: string; from: "user" | "assistant"; text: string };

const turns: Turn[] = [
	{ id: "turn-1", from: "user", text: "What's live right now?" },
	{
		id: "turn-2",
		from: "assistant",
		text: "Three endpoints are online: https://api.example.com, https://app.example.com, and tcp://1.tcp.ngrok.io:20012. Each one has run for more than a week with no restarts.",
	},
	{ id: "turn-3", from: "user", text: "Which of them have no traffic policy?" },
	{
		id: "turn-4",
		from: "assistant",
		text: "Two have none: https://api.example.com and tcp://1.tcp.ngrok.io:20012. The first takes every request it gets. The second is open to the internet. app.example.com already has a policy, so it needs no change.",
	},
	{ id: "turn-5", from: "user", text: "Add a rate limit by client IP to the API endpoint." },
	{
		id: "turn-6",
		from: "assistant",
		text: "Done. https://api.example.com now allows 100 requests a minute from each client IP and returns 429 above that. The change took effect at once, with no restart.",
	},
	{ id: "turn-7", from: "user", text: "And restrict the TCP address to our office network." },
	{
		id: "turn-8",
		from: "assistant",
		text: "Done. tcp://1.tcp.ngrok.io:20012 now accepts connections from 203.0.113.0/24 only. A connection from any other address closes before it reaches your service.",
	},
];

/** The person's messages, which the outline lists. */
const questions = turns.filter((turn) => turn.from === "user");

/** The first example on the Conversation Outline docs page: the trigger in the chat header. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Card.Root className="flex h-96 w-full max-w-md flex-col overflow-hidden p-0">
				<div className="flex items-center justify-between border-b px-4 py-2">
					<h2 className="text-strong text-sm font-medium">Assistant</h2>
					{/* Why three: with one or two messages, a scroll is faster than the outline. */}
					{questions.length >= 3 && (
						<ConversationOutline.Root>
							<ConversationOutline.Trigger />
							<ConversationOutline.Content align="end">
								{questions.map((turn) => (
									<ConversationOutline.Item key={turn.id} target={turn.id}>
										{turn.text}
									</ConversationOutline.Item>
								))}
							</ConversationOutline.Content>
						</ConversationOutline.Root>
					)}
				</div>
				<Conversation.Root className="min-h-0 flex-1">
					<Conversation.Viewport>
						<Conversation.Content aria-label="Conversation with the assistant" className="p-4">
							{turns.map((turn) => (
								<Message.Root key={turn.id} id={turn.id} from={turn.from} className="scroll-mt-4">
									<Message.Content>{turn.text}</Message.Content>
								</Message.Root>
							))}
						</Conversation.Content>
					</Conversation.Viewport>
					<Conversation.ScrollButton />
				</Conversation.Root>
			</Card.Root>
		</PreviewCanvas>
	);
}

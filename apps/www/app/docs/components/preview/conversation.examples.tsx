import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Conversation } from "@ngrok/mantle/conversation";
import { Message } from "@ngrok/mantle/message";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

type Turn = { id: number; from: "user" | "assistant"; text: string };

const answer = `Two of your endpoints have no traffic policy.

https://api.example.com takes every request it gets. Add a rate limit by client IP so one client cannot use up its capacity.

tcp://1.tcp.ngrok.io:20012 is open to the internet. Add an IP restriction so only your office network can reach it.

app.example.com already has a policy, so it needs no change.

To add a policy, open the endpoint, choose Traffic Policy, and paste the rule. The change takes effect at once, with no restart. You can test it with a request from another network before you rely on it.`;

const firstTurns: Turn[] = [
	{ id: 1, from: "user", text: "What's live right now?" },
	{
		id: 2,
		from: "assistant",
		text: "Three endpoints are online: https://api.example.com, https://app.example.com, and tcp://1.tcp.ngrok.io:20012.",
	},
];

/** The first example on the Conversation docs page: each press streams a pretend answer, word by word. */
export function OverviewExample() {
	const [turns, setTurns] = useState(firstTurns);
	const [streaming, setStreaming] = useState(false);

	useEffect(() => {
		if (!streaming) {
			return;
		}
		const words = answer.split(" ");
		let count = 0;
		const interval = setInterval(() => {
			count += 1;
			const text = words.slice(0, count).join(" ");
			setTurns((current) =>
				current.map((turn, index) => (index === current.length - 1 ? { ...turn, text } : turn)),
			);
			if (count === words.length) {
				setStreaming(false);
			}
		}, 60);
		return () => clearInterval(interval);
	}, [streaming]);

	return (
		<PreviewCanvas className="flex-col gap-4">
			<Card.Root className="h-80 w-full max-w-2xl overflow-hidden p-0">
				<Conversation.Root streaming={streaming} className="h-full">
					<Conversation.Viewport aria-label="Conversation with the assistant">
						<Conversation.Content className="p-4">
							{turns.map((turn) => (
								<Message.Root key={turn.id} from={turn.from}>
									<Message.Content className="flex flex-col gap-3">
										{turn.text.split("\n\n").map((paragraph) => (
											<p key={paragraph}>{paragraph}</p>
										))}
									</Message.Content>
								</Message.Root>
							))}
						</Conversation.Content>
					</Conversation.Viewport>
					<Conversation.ScrollButton />
				</Conversation.Root>
			</Card.Root>
			<Button
				type="button"
				appearance="filled"
				intent="neutral"
				disabled={streaming}
				onClick={() => {
					setTurns((current) => [
						...current,
						{
							id: current.length + 1,
							from: "user",
							text: "Which endpoints have no traffic policy?",
						},
						{ id: current.length + 2, from: "assistant", text: "" },
					]);
					setStreaming(true);
				}}
			>
				Ask about traffic policies
			</Button>
		</PreviewCanvas>
	);
}

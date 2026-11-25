import { IconButton } from "@ngrok/mantle/button";
import { Conversation } from "@ngrok/mantle/conversation";
import { useCopyToClipboard } from "@ngrok/mantle/hooks";
import { Message } from "@ngrok/mantle/message";
import { CopyIcon } from "@phosphor-icons/react/Copy";

import { PreviewCanvas } from "~/components/preview-canvas";

const answer =
	"Three endpoints are online: https://api.example.com, https://app.example.com, and tcp://1.tcp.ngrok.io:20012.";

/** The first example on the Message docs page. */
export function OverviewExample() {
	const copy = useCopyToClipboard();

	return (
		<PreviewCanvas>
			<Conversation.Root className="w-full max-w-2xl">
				<Conversation.Viewport>
					<Conversation.Content aria-label="Conversation with the assistant" className="p-4">
						<Message.Root from="user">
							<Message.Content>What&apos;s live right now?</Message.Content>
						</Message.Root>
						<Message.Root from="assistant">
							<Message.Content>{answer}</Message.Content>
							<Message.Actions>
								<IconButton
									type="button"
									appearance="ghost"
									intent="neutral"
									size="sm"
									label="Copy the answer"
									icon={<CopyIcon />}
									onClick={() => {
										void copy(answer);
									}}
								/>
							</Message.Actions>
						</Message.Root>
					</Conversation.Content>
				</Conversation.Viewport>
			</Conversation.Root>
		</PreviewCanvas>
	);
}

/** An answer on its way: the part that arrived, then the pending marker. */
export function PendingExample() {
	return (
		<PreviewCanvas>
			<Conversation.Root streaming className="w-full max-w-2xl">
				<Conversation.Viewport>
					<Conversation.Content aria-label="Conversation with the assistant" className="p-4">
						<Message.Root from="user">
							<Message.Content>Which endpoints have no traffic policy?</Message.Content>
						</Message.Root>
						<Message.Root from="assistant">
							<Message.Content>Let me check your endpoints.</Message.Content>
							<Message.Pending>Thinking…</Message.Pending>
						</Message.Root>
					</Conversation.Content>
				</Conversation.Viewport>
			</Conversation.Root>
		</PreviewCanvas>
	);
}

import { Alert } from "@ngrok/mantle/alert";
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Attachment } from "@ngrok/mantle/attachment";
import { Button, IconButton } from "@ngrok/mantle/button";
import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
import { Conversation } from "@ngrok/mantle/conversation";
import { ConversationOutline } from "@ngrok/mantle/conversation-outline";
import { Empty } from "@ngrok/mantle/empty";
import { Main } from "@ngrok/mantle/main";
import { Markdown } from "@ngrok/mantle/markdown";
import { Message } from "@ngrok/mantle/message";
import { PromptInput } from "@ngrok/mantle/prompt-input";
import { Reasoning } from "@ngrok/mantle/reasoning";
import { useCopyToClipboard } from "@ngrok/mantle/hooks";
import { Select } from "@ngrok/mantle/select";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { ToolCall } from "@ngrok/mantle/tool-call";
import { Work } from "@ngrok/mantle/work";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/ArrowClockwise";
import { ChatsCircleIcon } from "@phosphor-icons/react/ChatsCircle";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { XIcon } from "@phosphor-icons/react/X";
import { useRef, useState } from "react";
import {
	type ChatAnswer,
	type ChatFile,
	type ChatMessage,
	type ChatToolCall,
	type ChatUserMessage,
	useChat,
} from "~/features/chat";
import { mockRespond } from "~/features/chat-mock";

const models = [
	{ value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
	{ value: "gpt-6-sol", label: "GPT-6 Sol" },
	{ value: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen" },
];

const starters = ["Which endpoints have no traffic policy?", "Why did my last request fail?"];

/** A file in the composer, kept until the message sends. */
type DraftFile = ChatFile & { file: File };

/**
 * The chat as a full page. Switch the preview to its mobile width to see the
 * narrow layout.
 */
export function ChatDemo() {
	const chat = useChat({ respond: mockRespond });

	return (
		<Main className="fixed inset-0 flex flex-col">
			<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
				<h1 className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</h1>
				<ChatOutline messages={chat.messages} />
			</header>
			<Chat chat={chat} />
		</Main>
	);
}

/**
 * The same chat in `AppLayout.SidePanel`, beside the page it helps with. The
 * panel is narrow, so the chat takes its narrow layout, as on a phone.
 */
export function ChatPanelDemo() {
	const chat = useChat({ respond: mockRespond });

	return (
		<AppLayout.Root className="fixed inset-0">
			<SkipToMainLink />
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header>
							<AppLayout.HeaderContent>
								<p className="text-strong text-sm font-medium">Endpoints</p>
							</AppLayout.HeaderContent>
							<AppLayout.HeaderActions>
								<AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
							</AppLayout.HeaderActions>
						</AppLayout.Header>
						<AppLayout.Body>
							<div className="mx-auto max-w-7xl space-y-3 p-6">
								{Array.from({ length: 8 }, (_, index) => (
									<div key={index} className="border-card-muted rounded-lg border p-4">
										<p className="text-strong text-sm font-medium">Endpoint {index + 1}</p>
									</div>
								))}
							</div>
						</AppLayout.Body>
					</AppLayout.Content>
					<AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md">
						<AppLayout.SidePanelHeader>
							<p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
							<ChatOutline messages={chat.messages} />
							<AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
						</AppLayout.SidePanelHeader>
						<Chat chat={chat} />
					</AppLayout.SidePanel>
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>
		</AppLayout.Root>
	);
}

/**
 * The outline of the person's messages, for the chat's header at every width.
 * It shows from the third message: with fewer, a scroll is faster. It renders
 * before the header's other actions, so they do not move when it appears.
 */
function ChatOutline({ messages }: { messages: ChatMessage[] }) {
	const questions = messages.filter(
		(message): message is ChatUserMessage => message.from === "user",
	);
	if (questions.length < 3) {
		return null;
	}

	return (
		<ConversationOutline.Root>
			<ConversationOutline.Trigger />
			<ConversationOutline.Content align="end">
				{questions.map((message) => (
					<ConversationOutline.Item key={message.id} target={message.id}>
						{message.text.trim() || message.files.map((file) => file.name).join(", ")}
					</ConversationOutline.Item>
				))}
			</ConversationOutline.Content>
		</ConversationOutline.Root>
	);
}

/**
 * A full chat: an empty state with starter prompts, a transcript that follows
 * the answer as it streams, and a composer with attachments, a model picker,
 * dictation, and one send-or-stop button. It fills its container: a page, a
 * side panel, or a phone. The answer comes from a mock, so the demo runs with
 * no network. Ask anything with "fail" in it to see a failed answer.
 *
 * One gutter sets the layout at each width, as Amp does. The composer sits one
 * gutter in from the edge. The transcript sits 0.5rem further in, so its edges
 * line up with the composer's buttons and the composer is always the wider of
 * the two. The gutter is 0.75rem, and 1rem when the chat is wider than 32rem.
 */
function Chat({ chat }: { chat: ReturnType<typeof useChat> }) {
	const [draft, setDraft] = useState("");
	const [files, setFiles] = useState<DraftFile[]>([]);
	const [model, setModel] = useState(models[0]?.value ?? "");
	const fieldRef = useRef<HTMLTextAreaElement>(null);

	function send(text: string) {
		if (text.trim() === "" && files.length === 0) {
			return;
		}
		chat.send({ text, files: files.map(({ id, name, size }) => ({ id, name, size })), model });
		setDraft("");
		setFiles([]);
		// Why: a starter button leaves with the empty state, so focus must not fall to the page.
		fieldRef.current?.focus();
	}

	const lastAnswer = chat.messages.findLast((message) => message.from === "assistant");

	return (
		<div className="@container flex min-h-0 flex-1 flex-col">
			{/* Why a second element: a container query reads an ancestor, so the gutter sits inside the container. */}
			<div className="flex min-h-0 flex-1 flex-col [--gutter:--spacing(3)] @lg:[--gutter:--spacing(4)]">
				<Conversation.Root streaming={chat.streaming} className="min-h-0 flex-1">
					{chat.messages.length === 0 ? (
						<Empty.Root className="m-auto">
							<Empty.Icon svg={<ChatsCircleIcon />} />
							<Empty.Title>Ask about your endpoints</Empty.Title>
							<Empty.Description>
								<p>The assistant reads your account. It never changes anything without asking.</p>
							</Empty.Description>
							<Empty.Actions className="flex-wrap justify-center">
								{starters.map((starter) => (
									<Button
										key={starter}
										type="button"
										appearance="outlined"
										intent="neutral"
										onClick={() => send(starter)}
									>
										{starter}
									</Button>
								))}
							</Empty.Actions>
						</Empty.Root>
					) : (
						<Conversation.Viewport aria-label="Conversation with the assistant">
							<Conversation.Content className="mx-auto w-full max-w-3xl px-[calc(var(--gutter)+(--spacing(2)))] py-6">
								{chat.messages.map((message) =>
									message.from === "user" ? (
										<Message.Root
											key={message.id}
											id={message.id}
											from="user"
											className="scroll-mt-4"
										>
											<Message.Content className="flex flex-col gap-2">
												{message.files.length > 0 && (
													<Attachment.List aria-label="Attached files">
														{message.files.map((file) => (
															<Attachment.Root key={file.id}>
																<Attachment.Preview />
																<Attachment.Name title={file.name}>{file.name}</Attachment.Name>
																<Attachment.Size bytes={file.size} />
															</Attachment.Root>
														))}
													</Attachment.List>
												)}
												<p className="whitespace-pre-wrap">{message.text}</p>
											</Message.Content>
										</Message.Root>
									) : (
										<Answer
											key={message.id}
											answer={message}
											onRetry={
												message === lastAnswer
													? () => {
															chat.retry(model);
															// Why: Retry leaves while the new answer streams, so focus moves to the field.
															fieldRef.current?.focus();
														}
													: undefined
											}
										/>
									),
								)}
							</Conversation.Content>
						</Conversation.Viewport>
					)}
					{/* Why the column: the button sits just outside the transcript's right edge, not at the window's. */}
					<div className="absolute inset-x-0 bottom-3 mx-auto max-w-3xl">
						<Conversation.ScrollButton className="right-[calc(var(--gutter)+(--spacing(1.5)))] bottom-0" />
					</div>
				</Conversation.Root>
				<div className="mx-auto w-full max-w-3xl px-(--gutter) pb-(--gutter)">
					<PromptInput.Root
						streaming={chat.streaming}
						onStop={chat.stop}
						onFilesAdd={(added) => {
							const entries = added.map((file) => ({
								id: crypto.randomUUID(),
								name: file.name,
								size: file.size,
								file,
							}));
							setFiles((current) => [...current, ...entries]);
						}}
						onSubmit={(event) => {
							event.preventDefault();
							send(draft);
						}}
					>
						{files.length > 0 && (
							<Attachment.List aria-label="Files to send" className="px-3 pt-3">
								{files.map((file) => (
									<Attachment.Root key={file.id}>
										<Attachment.Preview />
										<Attachment.Name title={file.name}>{file.name}</Attachment.Name>
										<Attachment.Size bytes={file.size} />
										<Attachment.Remove
											label={`Remove ${file.name}`}
											onClick={() =>
												setFiles((current) => current.filter((entry) => entry.id !== file.id))
											}
										/>
									</Attachment.Root>
								))}
							</Attachment.List>
						)}
						<PromptInput.TextArea
							ref={fieldRef}
							aria-label="Message the assistant"
							name="message"
							placeholder="Ask about your endpoints…"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
						/>
						<PromptInput.Footer>
							<PromptInput.AttachButton />
							<Select.Root name="model" value={model} onValueChange={setModel}>
								<Select.Trigger
									aria-label="Model"
									className="h-8 w-auto rounded-full border-transparent bg-transparent shadow-none hover:border-transparent"
								>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									{models.map((option) => (
										<Select.Item key={option.value} value={option.value}>
											{option.label}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
							<PromptInput.Dictate />
							<PromptInput.Submit />
						</PromptInput.Footer>
					</PromptInput.Root>
				</div>
			</div>
		</div>
	);
}

/** One answer: its reasoning, its tool calls, its text, and how it ended. */
function Answer({ answer, onRetry }: { answer: ChatAnswer; onRetry: (() => void) | undefined }) {
	const streaming = answer.status === "streaming";
	const reasoningStreams = streaming && answer.reasoningSeconds == null;
	const copy = useCopyToClipboard();

	return (
		<Message.Root from="assistant">
			<Message.Content className="flex flex-col gap-3">
				{(answer.reasoning !== "" || answer.tools.length > 0) && (
					<Work.Root streaming={streaming}>
						<Work.Trigger />
						<Work.Content>
							{answer.reasoning !== "" && (
								<Reasoning.Root streaming={reasoningStreams}>
									<Reasoning.Trigger>
										{answer.reasoningSeconds == null
											? "Reasoning"
											: `Thought for ${answer.reasoningSeconds} ${answer.reasoningSeconds === 1 ? "second" : "seconds"}`}
									</Reasoning.Trigger>
									<Reasoning.Content>{answer.reasoning}</Reasoning.Content>
								</Reasoning.Root>
							)}
							{answer.tools.map((tool) => (
								<Tool key={tool.id} tool={tool} />
							))}
						</Work.Content>
					</Work.Root>
				)}
				{answer.text !== "" && <Markdown streaming={streaming}>{answer.text}</Markdown>}
				{answer.status === "failed" && (
					<Alert.Root intent="danger" role="alert">
						<Alert.Icon />
						<Alert.Content>
							<Alert.Title>The answer stopped partway</Alert.Title>
							<Alert.Description>
								The connection to the model dropped. Retry to ask again.
							</Alert.Description>
						</Alert.Content>
					</Alert.Root>
				)}
				{answer.status === "stopped" && (
					<p className="text-muted text-sm">You stopped this answer.</p>
				)}
			</Message.Content>
			{/* Why the reasoning check: Reasoning already reads "Thinking…" while it streams. */}
			{streaming && !(reasoningStreams && answer.reasoning !== "") && (
				<Message.Pending>Thinking…</Message.Pending>
			)}
			{!streaming && (
				<Message.Actions>
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						size="sm"
						label="Copy the answer"
						icon={<CopyIcon />}
						onClick={() => {
							copy(answer.text).catch(() => {
								makeToast(
									<Toast.Root intent="danger">
										<Toast.Icon />
										<Toast.Message>Could not copy the answer.</Toast.Message>
									</Toast.Root>,
								);
							});
						}}
					/>
					{onRetry != null && (
						<IconButton
							type="button"
							appearance="ghost"
							intent="neutral"
							size="sm"
							label="Retry"
							icon={<ArrowClockwiseIcon />}
							onClick={onRetry}
						/>
					)}
				</Message.Actions>
			)}
		</Message.Root>
	);
}

/** One tool call, with its arguments and, once it ends, its result. */
function Tool({ tool }: { tool: ChatToolCall }) {
	return (
		<ToolCall.Root status={tool.status}>
			<ToolCall.Trigger>
				<ToolCall.Name>{tool.name}</ToolCall.Name>
			</ToolCall.Trigger>
			<ToolCall.Content>
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Title>Arguments</CodeBlock.Title>
					</CodeBlock.Header>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={jsonCodeBlockValue(tool.args)} />
					</CodeBlock.Body>
				</CodeBlock.Root>
				{tool.result != null && (
					<CodeBlock.Root>
						<CodeBlock.Header>
							<CodeBlock.Title>Result</CodeBlock.Title>
						</CodeBlock.Header>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={jsonCodeBlockValue(tool.result)} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				)}
			</ToolCall.Content>
		</ToolCall.Root>
	);
}

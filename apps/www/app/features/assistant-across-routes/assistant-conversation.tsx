import { Button, IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { Icon } from "@ngrok/mantle/icon";
import { LiveRegion } from "@ngrok/mantle/live-region";
import { TextArea } from "@ngrok/mantle/text-area";
import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { BroadcastIcon } from "@phosphor-icons/react/Broadcast";
import { GaugeIcon } from "@phosphor-icons/react/Gauge";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

/** One turn of the conversation. */
type AssistantMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

/**
 * The conversation the assistant's two homes share. The page on the assistant
 * route and the side panel on every other route both render it, so it lives
 * above both and nothing in it belongs to one host.
 */
type AssistantConversation = {
	messages: ReadonlyArray<AssistantMessage>;
	/** The composer's unsent text. Held here so a route change keeps it. */
	draft: string;
	/** True from a send until the reply has arrived in full. */
	isReplying: boolean;
	setDraft: (draft: string) => void;
	/**
	 * Appends the user's message and starts the reply. Returns `false`, and
	 * changes nothing, for a blank message or while a reply is in flight.
	 */
	send: (text: string) => boolean;
	/** Clears the conversation and stops a reply in flight. */
	reset: () => void;
};

const AssistantConversationContext = createContext<AssistantConversation | null>(null);

/**
 * Reads the conversation. Throws outside `AssistantConversationProvider`.
 *
 * @example
 * ```tsx
 * const { messages, send } = useAssistantConversation();
 * ```
 */
function useAssistantConversation(): AssistantConversation {
	const conversation = useContext(AssistantConversationContext);
	if (conversation == null) {
		throw new Error("useAssistantConversation must be used inside AssistantConversationProvider.");
	}
	return conversation;
}

/** The canned replies this demo streams. A real assistant streams from a server. */
const scriptedReplies = [
	"Here is the shape. A Traffic Policy on the inbound phase with an oauth action in front of your API, scoped to the endpoint you named. Every request then carries a verified identity before it reaches your upstream, and the policy is the only thing you deploy.",
	"That endpoint already has a policy with one rule. Adding a rate-limit action after the oauth action keeps the identity check first, so an anonymous burst is rejected before it counts against anyone's quota.",
	"You can apply it from the endpoint's Traffic Policy tab. The editor validates the YAML as you type, and the apply is atomic: the old policy serves until the new one is live.",
] as const;

/** The gap between two revealed words, in milliseconds. */
const revealIntervalMs = 45;

/** The visible wait beside the pulsing dot, and the first thing the live region announces after a send. */
const pendingLabel = "Working through it…";

/**
 * The text the transcript's live region carries: the wait while a reply
 * streams, then the whole reply once it has landed, and nothing between turns.
 * The region reads the reply once, not a word at a time: a live region
 * re-announces on every change, and a stream of single words would interrupt
 * the reader fifty times.
 */
function announcementFor(messages: ReadonlyArray<AssistantMessage>, isReplying: boolean): string {
	if (isReplying) {
		return pendingLabel;
	}
	const lastMessage = messages[messages.length - 1];
	if (lastMessage?.role === "assistant") {
		return lastMessage.text;
	}
	return "";
}

/**
 * Owns the conversation: the messages, the composer's draft, and the reply in
 * flight. Render it once, above the shell, so the assistant's page and its side
 * panel read one conversation and a route change never restarts a reply.
 *
 * The reply streams word by word on a timer this provider holds. Nothing in a
 * host component owns the timer, which is what lets the host unmount mid-reply.
 *
 * @example
 * ```tsx
 * <AssistantConversationProvider>
 *   <Sidebar.Root>
 *     <AppLayout.Root className="fixed inset-0">…</AppLayout.Root>
 *   </Sidebar.Root>
 * </AssistantConversationProvider>
 * ```
 */
function AssistantConversationProvider({ children }: { children: ReactNode }) {
	const [messages, setMessages] = useState<ReadonlyArray<AssistantMessage>>([]);
	const [draft, setDraft] = useState("");
	const [isReplying, setIsReplying] = useState(false);
	const replyTimer = useRef<number | null>(null);
	const replyCount = useRef(0);

	const stopReply = useCallback(() => {
		if (replyTimer.current != null) {
			window.clearTimeout(replyTimer.current);
			replyTimer.current = null;
		}
		setIsReplying(false);
	}, []);

	useEffect(() => stopReply, [stopReply]);

	const send = useCallback((text: string): boolean => {
		const trimmed = text.trim();
		if (trimmed === "" || replyTimer.current != null) {
			return false;
		}
		const turn = replyCount.current;
		replyCount.current += 1;
		const replyId = `assistant-${turn}`;
		const reply = scriptedReplies[turn % scriptedReplies.length] ?? scriptedReplies[0];
		const words = reply.split(" ");
		setMessages((current) => [
			...current,
			{ id: `user-${turn}`, role: "user", text: trimmed },
			{ id: replyId, role: "assistant", text: "" },
		]);
		setIsReplying(true);

		const reveal = (count: number) => {
			const revealed = words.slice(0, count).join(" ");
			setMessages((current) =>
				current.map((message) =>
					message.id === replyId ? { ...message, text: revealed } : message,
				),
			);
			if (count === words.length) {
				replyTimer.current = null;
				setIsReplying(false);
				return;
			}
			replyTimer.current = window.setTimeout(() => reveal(count + 1), revealIntervalMs);
		};
		replyTimer.current = window.setTimeout(() => reveal(1), revealIntervalMs * 8);
		return true;
	}, []);

	const reset = useCallback(() => {
		stopReply();
		setMessages([]);
		setDraft("");
	}, [stopReply]);

	const conversation = useMemo<AssistantConversation>(
		() => ({ messages, draft, isReplying, setDraft, send, reset }),
		[messages, draft, isReplying, send, reset],
	);

	return (
		<AssistantConversationContext.Provider value={conversation}>
			{children}
		</AssistantConversationContext.Provider>
	);
}

/** The prompts the empty state offers, each with the icon on its card. */
const starterPrompts = [
	{ prompt: "Route and authenticate API traffic", icon: <ShieldCheckIcon /> },
	{ prompt: "Rate limit an endpoint by caller", icon: <GaugeIcon /> },
	{ prompt: "Add a custom domain to an endpoint", icon: <GlobeHemisphereWestIcon /> },
	{ prompt: "Share a local API without deploying", icon: <BroadcastIcon /> },
] as const;

/**
 * Scrolls the nearest scrollable ancestor to its end. The host owns the scroll
 * region, and a composer stuck to its bottom edge covers a sentinel scrolled
 * into view, so the transcript moves the region itself.
 */
function scrollHostToEnd(node: HTMLElement) {
	let host = node.parentElement;
	while (host != null) {
		const { overflowY } = getComputedStyle(host);
		if (overflowY === "auto" || overflowY === "scroll") {
			host.scrollTop = host.scrollHeight;
			return;
		}
		host = host.parentElement;
	}
}

/**
 * The messages, or the starter deck before there are any. Sized with container
 * queries, so one component is right at full-page width and in a 336px panel.
 * Render it inside the host's scroll region: `AppLayout.Body` on the assistant
 * route, `AppLayout.SidePanelBody` in the panel.
 *
 * A live region mounted beside the transcript announces the wait on a send
 * and the whole reply once it lands, so a reader who stays in the composer
 * hears the answer. The visible paragraph that streams the reply is not a live
 * region: it would re-announce on every word.
 *
 * @example
 * ```tsx
 * <AppLayout.Body>
 *   <AssistantTranscript onSend={() => setOpen(true)} />
 * </AppLayout.Body>
 * ```
 */
function AssistantTranscript({
	onSend,
}: {
	/** Runs after a starter prompt is accepted. The assistant's page opens the companion here. */
	onSend?: () => void;
}) {
	const { messages, isReplying, send } = useAssistantConversation();
	const endRef = useRef<HTMLDivElement>(null);

	// Why an effect: the newest text must stay in view while a reply grows. The
	// scroll region is the host's, so the sentinel finds it and scrolls it.
	useEffect(() => {
		if (messages.length > 0 && endRef.current != null) {
			scrollHostToEnd(endRef.current);
		}
	}, [messages]);

	const choose = (prompt: string) => {
		if (send(prompt)) {
			onSend?.();
		}
	};

	// Why mounted before the first send: a live region announces a change, not
	// its first text, so the region that announces the wait must already be there.
	// Both branches put it first in a fragment, so the first send swaps the deck
	// for the list and keeps the region.
	const announcer = <LiveRegion>{announcementFor(messages, isReplying)}</LiveRegion>;

	if (messages.length === 0) {
		return (
			<>
				{announcer}
				<div className="@container flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-4 @2xl:gap-6 @2xl:p-6">
					<span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 @2xl:size-9">
						<Icon svg={<SparkleIcon />} className="size-4 @2xl:size-5" />
					</span>
					<div className="flex flex-col items-center gap-2 text-center">
						<h2 className="text-strong text-lg font-medium text-balance @2xl:text-2xl">
							What should we do today?
						</h2>
						<p className="text-body max-w-lg text-xs text-pretty @2xl:text-sm">
							Pick a starting point and the assistant writes the Traffic Policy and gets your
							endpoints running.
						</p>
					</div>
					<div className="grid w-full max-w-md gap-2 @2xl:max-w-2xl @2xl:grid-cols-2 @2xl:gap-3">
						{starterPrompts.map(({ prompt, icon }) => (
							<Button
								key={prompt}
								type="button"
								appearance="outlined"
								intent="neutral"
								className="h-auto justify-start gap-3 px-3 py-2.5 text-left whitespace-normal @2xl:py-3"
								onClick={() => choose(prompt)}
							>
								<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
									<Icon svg={icon} className="size-4" />
								</span>
								{prompt}
							</Button>
						))}
					</div>
				</div>
			</>
		);
	}

	const lastMessage = messages[messages.length - 1];

	return (
		<>
			{announcer}
			<div className="@container mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 @2xl:p-6">
				{messages.map((message) =>
					message.role === "user" ? (
						<div key={message.id} className="flex justify-end">
							<p className="bg-neutral-500/8 text-strong max-w-[85%] rounded-2xl px-3.5 py-2 text-sm wrap-break-word whitespace-pre-wrap">
								{message.text}
							</p>
						</div>
					) : (
						<div key={message.id} className="text-body flex flex-col gap-2 text-sm">
							{message.text === "" && isReplying && lastMessage?.id === message.id ? (
								<p className="text-muted flex items-center gap-2">
									<span
										aria-hidden
										className="bg-muted size-1.5 animate-pulse rounded-full motion-reduce:animate-none"
									/>
									{/* Why a wrapper: the dot is a permanent sibling, and a translation
								    engine reparents bare text. The swap to the first word would then
								    remove a node React no longer owns. */}
									<span>{pendingLabel}</span>
								</p>
							) : (
								<p>{message.text}</p>
							)}
						</div>
					),
				)}
				<div ref={endRef} />
			</div>
		</>
	);
}

/**
 * The message box. Enter sends and Shift+Enter adds a line, which is what a chat
 * does and a bare textarea does not. The draft lives in the conversation, so
 * the box a route change unmounts and the box it mounts show the same text.
 *
 * @example
 * ```tsx
 * <AppLayout.SidePanelFooter>
 *   <AssistantComposer />
 * </AppLayout.SidePanelFooter>
 * ```
 */
function AssistantComposer({
	className,
	onSend,
}: {
	/** Merged onto the frame, for the host's measure. */
	className?: string;
	/** Runs after the conversation accepts a message. The assistant's page opens the companion here. */
	onSend?: () => void;
}) {
	const { draft, setDraft, send } = useAssistantConversation();

	// Why the guard: a send the conversation rejects, such as one during a reply,
	// must keep the draft, or the text is gone with nothing to show for it.
	const submit = () => {
		if (!send(draft)) {
			return;
		}
		setDraft("");
		onSend?.();
	};

	return (
		<div
			className={cx(
				"border-form bg-form flex items-end gap-2 rounded-[1.25rem] border p-2 shadow-sm",
				"focus-within:border-accent-600 focus-within:ring-focus-accent focus-within:ring-4",
				className,
			)}
		>
			<TextArea
				aria-label="Message the assistant"
				className="min-h-20 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
				placeholder="Ask about endpoints, domains, or Traffic Policy…"
				rows={3}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					// Why isComposing: an input method editor confirms a candidate with
					// Enter, and that Enter is not a send.
					if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
						return;
					}
					event.preventDefault();
					submit();
				}}
			/>
			{/* Never disabled: a greyed button on an empty box reads as broken at the
			    moment the box invites a first message. `submit` ignores a blank draft. */}
			<IconButton
				type="button"
				appearance="filled"
				intent="neutral"
				size="sm"
				className="size-8 shrink-0 rounded-full"
				icon={<ArrowUpIcon />}
				label="Send message"
				onClick={submit}
			/>
		</div>
	);
}

export {
	//,
	AssistantComposer,
	AssistantConversationProvider,
	AssistantTranscript,
	useAssistantConversation,
};
export type {
	//,
	AssistantConversation,
	AssistantMessage,
};

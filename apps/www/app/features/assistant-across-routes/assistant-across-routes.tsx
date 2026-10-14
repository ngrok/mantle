import { AppLayout, useSidePanel } from "@ngrok/mantle/app-layout";
import { IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { PencilSimpleLineIcon } from "@phosphor-icons/react/PencilSimpleLine";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import {
	AssistantComposer,
	AssistantTranscript,
	useAssistantConversation,
} from "./assistant-conversation";

/** The assistant's own route, where the conversation is the page. */
const assistantPath = "/assistant";

/**
 * Returns true on the assistant's route and on its children, such as a
 * conversation's own URL. A sibling route that shares the prefix is a
 * different page.
 *
 * @example
 * ```ts
 * isAssistantPath("/assistant"); // true
 * isAssistantPath("/assistant/c_123"); // true
 * isAssistantPath("/assistants"); // false
 * ```
 */
function isAssistantPath(pathname: string): boolean {
	return pathname === assistantPath || pathname.startsWith(`${assistantPath}/`);
}

/**
 * Returns true when a navigation enters or leaves the assistant's route. Those
 * are the only navigations that move the conversation between `main` and the
 * panel, so they are the only ones that run the view transition.
 *
 * @example
 * ```ts
 * crossesAssistant("/assistant", "/endpoints"); // true
 * crossesAssistant("/endpoints", "/domains"); // false
 * ```
 */
function crossesAssistant(from: string, to: string): boolean {
	return isAssistantPath(from) !== isAssistantPath(to);
}

/**
 * The `view-transition-name` the assistant's two homes share, as a class.
 * `AppLayout.Content` carries it on the assistant route and the open panel
 * carries it on every other route, so each state names exactly one element.
 * A name on two elements at once makes the browser skip the whole transition.
 * `assistant-view-transition.css` times the group by this name.
 */
const assistantViewTransitionClassName = "[view-transition-name:assistant]";

/** The control that starts a new conversation, in both headers. */
function NewConversationButton() {
	const { reset } = useAssistantConversation();

	return (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				<IconButton
					type="button"
					appearance="ghost"
					intent="neutral"
					size="sm"
					icon={<PencilSimpleLineIcon />}
					label="New conversation"
					onClick={reset}
				/>
			</Tooltip.Trigger>
			<Tooltip.Content>New conversation</Tooltip.Content>
		</Tooltip.Root>
	);
}

/**
 * The assistant's route: the conversation as the page. Renders the toolbar,
 * the `main` body, and the composer pinned below it, inside the shell's
 * `AppLayout.Content`. The first message opens the companion, so the
 * conversation comes along when the reader leaves.
 *
 * @example
 * ```tsx
 * // app/routes/assistant.tsx
 * export default function AssistantRoute() {
 *   return <AssistantPage />;
 * }
 * ```
 */
function AssistantPage() {
	const { setOpen } = useSidePanel();

	return (
		<>
			<AppLayout.Header>
				<AppLayout.HeaderStart>
					<Sidebar.Trigger />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderContent>
					<h1 className="text-strong text-sm font-medium">Assistant</h1>
				</AppLayout.HeaderContent>
				<AppLayout.HeaderActions>
					<NewConversationButton />
				</AppLayout.HeaderActions>
			</AppLayout.Header>
			<AppLayout.Body>
				{/* The composer is part of the page, so it pins inside `main`: the
				    column fills the card and the transcript scrolls above it. */}
				<div className="flex h-full flex-col">
					<div className="scrollbar min-h-0 flex-1 overflow-y-auto">
						<AssistantTranscript />
					</div>
					<div className="shrink-0 px-3 pb-3">
						<AssistantComposer className="mx-auto w-full max-w-xl" onSend={() => setOpen(true)} />
					</div>
				</div>
			</AppLayout.Body>
		</>
	);
}

/**
 * The assistant's panel: the same conversation beside a page. Render it as the
 * last child of `AppLayout.Workspace` on every route but the assistant's. On
 * that route the page is the home, and an `<aside>` beside it would name the
 * conversation twice.
 *
 * @example
 * ```tsx
 * <AppLayout.Workspace>
 *   <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *   <AppLayout.Content className={cx(onAssistantPage && assistantViewTransitionClassName)}>
 *     <Outlet />
 *   </AppLayout.Content>
 *   {!onAssistantPage && <AssistantPanel />}
 * </AppLayout.Workspace>
 * ```
 */
function AssistantPanel({
	mobileBreakpoint,
}: {
	/** Forwarded to `AppLayout.SidePanel`. Match it to `Sidebar.Root`'s. */
	mobileBreakpoint?: ComponentProps<typeof AppLayout.SidePanel>["mobileBreakpoint"];
}) {
	const { open } = useSidePanel();

	return (
		<AppLayout.SidePanel
			aria-label="Assistant"
			mobileBreakpoint={mobileBreakpoint}
			// Why only when open: a closed panel is a zero-width box, and a morph
			// from the page into it reads as the conversation folding into nothing.
			className={cx(open && assistantViewTransitionClassName)}
		>
			<AppLayout.SidePanelHeader>
				<h2 className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</h2>
				<NewConversationButton />
				<AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
			</AppLayout.SidePanelHeader>
			<AppLayout.SidePanelBody>
				<AssistantTranscript />
			</AppLayout.SidePanelBody>
			<AppLayout.SidePanelFooter>
				<AssistantComposer />
			</AppLayout.SidePanelFooter>
		</AppLayout.SidePanel>
	);
}

export {
	//,
	AssistantPage,
	AssistantPanel,
	assistantPath,
	assistantViewTransitionClassName,
	crossesAssistant,
	isAssistantPath,
};

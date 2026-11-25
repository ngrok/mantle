/**
 * Re-exports for the Panel component.
 *
 * @see https://mantle.ngrok.com/components/preview/panel
 */

import * as PanelParts from "./panel-parts.js";

/**
 * The look of `AppLayout.SidePanel` as a part of its own: a card with a header
 * row, a scroll region, and a bar pinned to the bottom. It has no open state
 * and no placement, so it renders the same wherever a caller puts it.
 * `AppLayout.SidePanel` renders it inside and adds the open state, the
 * placement beside the page card, and the spacing around it.
 *
 * @useWhen Show a titled surface beside other content, with a header row, a body that scrolls on its own, and an optional bar pinned to the bottom, such as an assistant beside the page.
 *
 * @siblings
 * - `AppLayout`: the panel opens and closes beside the page card of an app shell; use `AppLayout.SidePanel`.
 * - `Card`: the content sits in the page flow and does not scroll on its own.
 * - `Sheet`: the panel is a modal overlay with a backdrop.
 *
 * @see https://mantle.ngrok.com/components/preview/panel
 *
 * @example
 * Composition:
 * ```
 * Panel.Root
 * ├── Panel.Header
 * ├── Panel.Body
 * └── Panel.Footer
 * ```
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
const Panel = PanelParts;

export {
	//,
	Panel,
};
export type {
	//,
	PanelPartProps,
	PanelRootProps,
} from "./panel.js";

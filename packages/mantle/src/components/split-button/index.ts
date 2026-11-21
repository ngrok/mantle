/**
 * Re-exports for the Split Button component.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button
 */

import * as SplitButtonParts from "./split-button-parts.js";

/**
 * A button group that pairs a one-click default action with a dropdown menu
 * of related alternatives. Best for when users typically want one action but
 * occasionally need variants.
 *
 * @useWhen Run a default action on one click, and offer related alternatives in an attached menu.
 *
 * @siblings
 * - `Button`: the control runs one action, with no alternatives.
 * - `DropdownMenu`: the button only opens a menu and runs no default action.
 *
 * @see https://mantle.ngrok.com/components/actions/split-button
 *
 * @example
 * Composition:
 * ```
 * SplitButton.Root
 * ├── SplitButton.PrimaryAction
 * ├── SplitButton.MenuTrigger
 * └── SplitButton.MenuContent
 *     └── SplitButton.MenuItem
 * ```
 *
 * @example
 * ```tsx
 * <SplitButton.Root>
 *   <SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
 *     Copy page
 *   </SplitButton.PrimaryAction>
 *   <SplitButton.MenuTrigger label="Open doc actions menu" />
 *   <SplitButton.MenuContent>
 *     <SplitButton.MenuItem onClick={copyMarkdownPage}>
 *       <Icon svg={<CopyIcon />} />
 *       Copy page
 *     </SplitButton.MenuItem>
 *     <SplitButton.MenuItem asChild onClick={copyMarkdownPage}>
 *       <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
 *         <Icon svg={<FileTextIcon />} />
 *         View as Markdown
 *       </a>
 *     </SplitButton.MenuItem>
 *   </SplitButton.MenuContent>
 * </SplitButton.Root>
 * ```
 */
const SplitButton = SplitButtonParts;

export {
	//,
	SplitButton,
};

/**
 * Re-exports for the Dropdown Menu component.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu
 */

import * as DropdownMenuParts from "./dropdown-menu-parts.js";

/**
 * A menu of options or actions, triggered by a button.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` render at Tailwind
 * `z-50`, Mantle's float tier. When composed inside an open `Dialog`,
 * `AlertDialog`, or `Sheet`, they portal into that overlay's positioner and
 * paint above the overlay that owns them. Outside every overlay, they portal to
 * `document.body`, below the overlay tier (`z-60`). When sibling floats share a
 * container, the most recently mounted float paints on top.
 *
 * @useWhen Show a menu of actions or options when the user clicks a button.
 *
 * @siblings
 * - `Select`: the user picks one value for a form field.
 * - `SplitButton`: a default action runs on one click, and the menu holds its alternatives.
 * - `Command`: the user searches many actions or pages from the keyboard.
 * - `Popover`: the floating content is a small form or other content, not a menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu
 *
 * @example
 * Composition:
 * ```
 * DropdownMenu.Root
 * ├── DropdownMenu.Trigger
 * └── DropdownMenu.Content
 *     ├── DropdownMenu.Group
 *     │   ├── DropdownMenu.Label
 *     │   ├── DropdownMenu.Item
 *     │   │   └── DropdownMenu.Shortcut
 *     │   ├── DropdownMenu.CheckboxItem
 *     │   └── DropdownMenu.RadioGroup
 *     │       └── DropdownMenu.RadioItem
 *     ├── DropdownMenu.Separator
 *     └── DropdownMenu.Sub
 *         ├── DropdownMenu.SubTrigger
 *         └── DropdownMenu.SubContent
 * ```
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const DropdownMenu = DropdownMenuParts;

export {
	//,
	DropdownMenu,
};

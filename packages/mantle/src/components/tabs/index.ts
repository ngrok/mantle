/**
 * Re-exports for the Tabs component.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs
 */

import * as HeadlessTabsParts from "./headless-tabs-parts.js";
import * as TabsParts from "./tabs-parts.js";

/**
 * Layered sections of content, called tab panels, that show one at a time.
 *
 * @useWhen Switch between peer views of related content in one place, with one view visible at a
 * time.
 *
 * @siblings
 * - `Accordion`: several sections stack, and each one expands in place.
 * - `RadioGroup`: the user picks a form value, not a view.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs
 *
 * @example
 * Composition:
 * ```
 * Tabs.Root
 * ├── Tabs.List
 * │   └── Tabs.Trigger
 * │       └── Tabs.Badge
 * ├── Tabs.Separator
 * └── Tabs.Content
 * ```
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 *   <Tabs.Content value="password">
 *     <p>Change your password here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const Tabs = TabsParts;

/**
 * Tabs with mantle's behavior and no look of their own: the keyboard, ARIA,
 * focus, find-in-page, and overflow contract of `Tabs`, with only the focus
 * ring for keyboard focus. Style each part with your own classes.
 *
 * @useWhen A page needs tabs in its own visual language, such as large
 * use-case cards on a marketing page, and must keep mantle's tabs behavior.
 *
 * @siblings
 * - `Tabs`: the product look, with the underline or pill appearance.
 * - `SegmentedControl`: the user picks one value in a compact control, not a view.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#headless-tabs
 *
 * @example
 * Composition:
 * ```
 * HeadlessTabs.Root
 * ├── HeadlessTabs.List
 * │   └── HeadlessTabs.Trigger
 * └── HeadlessTabs.Content
 * ```
 *
 * @example
 * ```tsx
 * <HeadlessTabs.Root defaultValue="api" className="flex flex-col gap-6">
 *   <HeadlessTabs.List aria-label="Use cases" className="grid grid-cols-2">
 *     <HeadlessTabs.Trigger value="api" className="p-6 data-state-active:bg-card-hover">
 *       API gateway
 *     </HeadlessTabs.Trigger>
 *     <HeadlessTabs.Trigger value="webhooks" className="p-6 data-state-active:bg-card-hover">
 *       Webhooks
 *     </HeadlessTabs.Trigger>
 *   </HeadlessTabs.List>
 *   <HeadlessTabs.Content value="api">One front door for every API.</HeadlessTabs.Content>
 *   <HeadlessTabs.Content value="webhooks">Verify every webhook.</HeadlessTabs.Content>
 * </HeadlessTabs.Root>
 * ```
 */
const HeadlessTabs = HeadlessTabsParts;

export {
	//,
	HeadlessTabs,
	Tabs,
};

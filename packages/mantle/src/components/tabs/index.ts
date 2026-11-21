/**
 * Re-exports for the Tabs component.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs
 */

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

export {
	//,
	Tabs,
};

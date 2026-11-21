/**
 * Re-exports for the Accordion component.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion
 */

import * as AccordionParts from "./accordion-parts.js";

/**
 * A vertically stacked set of disclosure sections styled after the shadcn /
 * ngrok.com accordion.
 *
 * Its defining feature: collapsed content is never removed from the DOM (it
 * stays put with `hidden="until-found"`), so the browser's find-in-page (⌘F /
 * Ctrl-F) can find text inside closed sections and auto-expand them (synced via
 * the `beforematch` event). Built on plain `<div>`/`<button>` elements, so a
 * section header can be any layout, including a non-toggling action button
 * beside the trigger.
 *
 * `Accordion.Root` defaults to `type="multiple"` (sections open independently);
 * pass `type="single"` when opening one section should auto-close the others.
 *
 * @useWhen Stack titled sections that each expand and collapse in place, such as questions and
 * answers or a group of advanced settings.
 *
 * @siblings
 * - `Tabs`: one section shows at a time, and a row of tabs switches between them.
 * - `Strata`: every section stays open, with its title and explanation beside its content.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion
 *
 * @example
 * Composition:
 * ```
 * Accordion.Root
 * └── Accordion.Item
 *     ├── Accordion.Trigger
 *     │   └── Accordion.TriggerIcon
 *     └── Accordion.Content
 *         └── Accordion.Body
 * ```
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Accordion = AccordionParts;

export {
	//,
	Accordion,
};

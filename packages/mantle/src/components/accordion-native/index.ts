/**
 * Re-exports for the native Accordion, published as `@ngrok/mantle/accordion/native`.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native
 */

import * as AccordionParts from "./accordion-native-parts.js";

/**
 * A vertically stacked set of disclosure sections on native `<details>` and `<summary>`
 * elements, with the part names and props of `Accordion` from `@ngrok/mantle/accordion`. A
 * swap is an import change, and a prop the native version cannot honor fails typecheck.
 *
 * The browser owns each section's open state, so the accordion ships no open-state
 * JavaScript, hydrates in about half the time on a long page, and a section opens before
 * the page hydrates. Trade-offs:
 * - `Trigger` is a `<summary>` and the direct first child of `Item`. It takes no `asChild`
 *   and no `disabled`, and the header row holds no other control.
 * - `type="single"` maps to `<details name>` (Chrome 120, Safari 17.2, Firefox 130). Older
 *   browsers let several sections open at once.
 * - The browser owns `open`. `onValueChange` reports from the `toggle` event after the change,
 *   and a controlled `value` that rejects a change does not close the section again.
 * - The slide needs `::details-content` (Chrome 131, Safari 18.4, Firefox 143) and
 *   `interpolate-size` (Chromium only). Without them, a section opens with no motion.
 * - No `data-state` attribute: style the open state from the native `open` attribute on
 *   `Item` with Tailwind's `open:` variant.
 *
 * @useWhen Stack many titled sections, such as a long FAQ or a mobile navigation menu, on a page
 * where load time matters more than a custom header row or a section that cannot close.
 *
 * @siblings
 * - `Accordion`: a header row holds a control beside the trigger, or the app must own the open state.
 * - `Tabs`: one section shows at a time, and a row of tabs switches between them.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native
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
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It is a native disclosure widget.</Accordion.Body>
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

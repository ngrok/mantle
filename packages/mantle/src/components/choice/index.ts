/**
 * Re-exports for the Choice component.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 */

import * as ChoiceParts from "./choice-parts.js";

/**
 * A reusable indicator-left / content-right layout for a single choice: a
 * control (checkbox, radio, switch) beside an emphasized title and an optional
 * de-emphasized description. Use it to pair a checkbox or radio with a rich,
 * titled label, or reach for it directly to build your own choice-like rows.
 *
 * It is a pure layout + association primitive: it owns the control's `id` and
 * the description's `id` and wires them together, but does **not** own the
 * control's value. Drop your own control into `Choice.Indicator`. Pick
 * `Choice.Label` (a real `<label>`) when the `Choice` owns the labeling, or
 * `Choice.Title` (label-less text) when an ancestor (a clickable row or a
 * Headless radio item) already does.
 *
 * **Use it for choice-like layouts:** a checkbox or radio input that needs an
 * associated label and an optional supplementary description. It is not a
 * general-purpose layout primitive; for laying out non-control content, reach
 * for a plain flex/grid or `MediaObject` instead.
 *
 * **Field interop.** Inside a `Field.Control`, `Choice.Root` reads the field's
 * `id` / `name` / `aria-*` and merges its description into the control's
 * `aria-describedby`. Outside a `Field` it uses its own generated ids. The two
 * are aware of each other but neither is required.
 *
 * **Radio interop.** Inside a `RadioGroup` item, `Choice.Title` and
 * `Choice.Description` register their ids with the radio, so the option's
 * accessible name is the title alone and the description is its
 * `aria-describedby`.
 *
 * @useWhen Put a checkbox, a radio, or a switch beside a title and an optional description.
 *
 * @siblings
 * - `Label`: the control needs only a one-line caption.
 * - `MediaObject`: the thing beside the text is an image or an icon, not a control.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * Composition:
 * ```
 * Choice.Root
 * ├── Choice.Indicator
 * └── Choice.Content
 *     ├── Choice.Label        (or Choice.Title, pick one)
 *     └── Choice.Description
 * ```
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Choice = ChoiceParts;

export {
	//,
	Choice,
};

export type {
	//,
	ChoiceRootProps,
} from "./choice.js";

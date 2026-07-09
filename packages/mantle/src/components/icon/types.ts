import type { ComponentProps } from "react";

/**
 * Props accepted by SVG-rendering primitives in mantle (`Icon`, `SvgOnly`, and
 * icon-bearing parts of other components). Extends the standard React `<svg>`
 * props with:
 *
 * - `focusable` narrowed to the string literals `"true"` / `"false"`, matching
 *   the SVG spec (React's default typing allows `boolean`, which serializes
 *   inconsistently across browsers for this attribute).
 * - `data-slot`, so these primitives can carry mantle's standard
 *   `data-slot="<name>"` styling hook alongside other consumer-supplied props.
 */
export type SvgAttributes = ComponentProps<"svg"> & {
	/**
	 * Whether the SVG can receive keyboard focus. Use the string form
	 * (`"true"` / `"false"`) — the SVG attribute is serialized as a string and
	 * React's boolean form can produce inconsistent output.
	 */
	focusable?: "true" | "false";
	/**
	 * Stable styling hook used by mantle to identify this element in the DOM
	 * (e.g. `data-slot="icon"`). Consumers can override it via props spread.
	 */
	"data-slot"?: string;
};

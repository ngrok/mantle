/**
 * The incoming `data-slot` chain a part receives when an ancestor composes it
 * via `asChild` — mantle's `Slot` forwards the ancestor chain so parts can
 * concatenate it ahead of their own slot name instead of clobbering it.
 */
type WithDataSlot = {
	/**
	 * The `data-slot` chain accumulated by ancestor `asChild` composition.
	 * Parts merge it ancestors-first with their own slot name via
	 * `joinDataSlot`, so the rendered attribute reads in DOM order — outermost
	 * ancestor through to the rendered element.
	 */
	"data-slot"?: string;
};

/**
 * Joins `data-slot` values in DOM order — ancestor chain first, the part's
 * own slot name last — skipping empty values. Returns `undefined` when every
 * value is empty so no empty `data-slot=""` attribute is rendered.
 *
 * @example
 * ```ts
 * joinDataSlot("centered-layout-body", "main"); // "centered-layout-body main"
 * joinDataSlot(undefined, "main"); // "main"
 * joinDataSlot(undefined, undefined); // undefined
 * ```
 */
function joinDataSlot(...values: Array<string | undefined>): string | undefined {
	const joined = values.filter((value) => value != null && value !== "").join(" ");
	return joined === "" ? undefined : joined;
}

export {
	//,
	joinDataSlot,
};

export type {
	//,
	WithDataSlot,
};

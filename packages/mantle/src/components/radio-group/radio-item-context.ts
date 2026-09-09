import { createContext } from "react";

/**
 * Registration callbacks a radio item offers the text inside it. A part that
 * names or describes the option (`Choice.Title`, `Choice.Description`) hands
 * its element id up. The item joins the ids into its `aria-labelledby` and
 * `aria-describedby`. Each callback returns the cleanup that removes the id.
 *
 * Why upward registration: the item is the `role="radio"` element and the
 * ancestor, so it cannot hand an id down to text it does not render.
 * `role="radio"` also flattens its children into one accessible name.
 */
type RadioItemContextValue = {
	/** Adds an id to the item's `aria-labelledby`. Returns the cleanup that removes it. */
	registerLabelId: (id: string) => () => void;
	/** Adds an id to the item's `aria-describedby`. Returns the cleanup that removes it. */
	registerDescriptionId: (id: string) => () => void;
};

/**
 * Published by every `RadioGroup` item variant (`Item`, `ListItem`, `Card`,
 * `Button`). `null` when no radio item is in the tree, so a registering part
 * is a no-op elsewhere.
 */
const RadioItemContext = createContext<RadioItemContextValue | null>(null);

export {
	//,
	RadioItemContext,
};
export type {
	//,
	RadioItemContextValue,
};

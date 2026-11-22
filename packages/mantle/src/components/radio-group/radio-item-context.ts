"use client";

import { createContext } from "react";

/**
 * The ids a radio item gives the text that names and describes it. The
 * item's native radio points `aria-describedby` at `descriptionId`, so
 * `Choice.Description` takes that id. `Choice.Title` registers its id, and
 * the radio points `aria-labelledby` at it in place of all of the item's text.
 */
type RadioItemContextValue = {
	/** The id `Choice.Title` takes when it has no `id` of its own. */
	titleId: string;
	/** The id `Choice.Description` takes, so the description describes the radio. */
	descriptionId: string;
	/** The id of the item's native radio, which `Choice.Label` points `htmlFor` at. */
	radioId: string;
	/** Makes the element with `id` the radio's name, or the item's text again for `null`. */
	registerTitle: (id: string | null) => void;
};

/**
 * Published by every radio item (`RadioGroup.Item`, `ListItem`, `Card`, and
 * `SegmentedControl.Item`). `null` outside a radio item.
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

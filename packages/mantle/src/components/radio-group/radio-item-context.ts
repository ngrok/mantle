"use client";

import { createContext } from "react";

/**
 * The state of a radio item and the ids it gives the text that names and
 * describes it. The item's native radio points `aria-describedby` at
 * `descriptionId`, so `Choice.Description` takes that id. `Choice.Title`
 * points the radio's `aria-labelledby` at itself in place of all of the
 * item's text.
 */
type RadioItemContextValue = {
	/** The id `Choice.Title` takes when it has no `id` of its own. */
	titleId: string;
	/** The id `Choice.Description` takes, so the description describes the radio. */
	descriptionId: string;
	/** The id of the item's native radio, which `Choice.Label` points `htmlFor` at. */
	radioId: string;
	/** The id of the item's content, which names the radio when no title does. */
	contentId: string;
	/** Whether the item's radio is checked. */
	checked: boolean;
	/** Whether the item's radio is disabled. */
	disabled: boolean;
};

/**
 * Published by every radio item (`RadioGroup.Item`, `ListItem`, `Card`, and
 * `SegmentedControl.Item`) and by `CheckboxGroup.Card`, whose checkbox id is
 * `radioId`. `null` outside those items.
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

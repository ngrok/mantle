"use client";

import { createContext } from "react";

/**
 * The ids a radio item gives the text that names and describes it. The
 * item's native radio points `aria-labelledby` at `titleId` and
 * `aria-describedby` at `descriptionId`, so `Choice.Title` and
 * `Choice.Description` take these ids and need no registration.
 */
type RadioItemContextValue = {
	/** The id `Choice.Title` takes, so the title alone names the radio. */
	titleId: string;
	/** The id `Choice.Description` takes, so the description describes the radio. */
	descriptionId: string;
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

"use client";

import type { ComponentProps } from "react";
import { createContext, useState } from "react";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithDataSlot } from "../../utils/data-slot.js";

/**
 * The chart List: a wrapper whose charts share one live region.
 *
 * This module is internal shared implementation — not exported from the package.
 */

type ChartListContextValue = {
	/** Write one chart's announcement. An empty one clears only that chart's text. */
	announce: (id: string, text: string) => void;
};

const ChartListContext = createContext<ChartListContextValue | null>(null);

type ChartListPrimitiveProps = ComponentProps<"div"> & WithDataSlot;

/**
 * The List implementation: the charts inside it share one live region, so a
 * page of 100 interactive charts mounts one region instead of 100.
 */
const ChartListPrimitive = ({
	slotName,
	"data-slot": dataSlot,
	children,
	...props
}: ChartListPrimitiveProps & { slotName: string }) => {
	const [announcement, setAnnouncement] = useState({ id: "", text: "" });
	const [context] = useState<ChartListContextValue>(() => ({
		announce: (id, text) => {
			setAnnouncement((current) => {
				if (text === "" && current.id !== id) {
					return current;
				}
				return current.id === id && current.text === text ? current : { id, text };
			});
		},
	}));
	return (
		// Why no asChild: the List renders its live region beside the charts, and
		// a list element such as `ul` cannot hold that region as a child.
		<div data-slot={joinDataSlot(dataSlot, slotName)} {...props}>
			{/* Why a wrapper: the live region is always beside the children, so they
			    are never its parent's lone child. `contents` keeps a grid or flex
			    layout on the List reaching the cards. */}
			<ChartListContext.Provider value={context}>
				<div data-slot={`${slotName}-items`} className="contents">
					{children}
				</div>
			</ChartListContext.Provider>
			<span role="status" aria-live="polite" className="sr-only">
				{announcement.text}
			</span>
		</div>
	);
};

export type {
	//,
	ChartListContextValue,
	ChartListPrimitiveProps,
};

export {
	//,
	ChartListContext,
	ChartListPrimitive,
};

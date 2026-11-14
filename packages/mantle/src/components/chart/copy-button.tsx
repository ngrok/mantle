"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { useCopyToClipboard } from "../../hooks/use-copy-to-clipboard.js";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { alternateAnnouncement } from "../../utils/alternate-announcement.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { IconSwap } from "../icon/icon-swap.js";
import { LiveRegion } from "../live-region/live-region.js";
import { serializeChartMarkdown } from "./serialize.js";
import { useChartContext } from "./context.js";

/**
 * The copy button part: copies the chart's data as a Markdown table.
 *
 * This module is internal shared implementation — not exported from the package.
 */

// The native `onCopy` clipboard event handler is omitted so the part's own
// callback (fired with the serialized markdown) can own the name — on a copy
// button, the DOM event is noise and the collision would poison both types.
type CopyButtonPrimitiveProps = Omit<
	ComponentProps<"button">,
	"aria-label" | "children" | "type" | "onCopy"
> &
	SelfClosingWithAsChild &
	WithDataSlot & {
		/**
		 * Not part of the API: `label` is the single way to name the button.
		 * Typed `never` rather than only omitted because TypeScript skips
		 * excess-attribute checks for hyphenated JSX attributes; the `never`
		 * type makes the JSX call site a compile error.
		 */
		"aria-label"?: never;
		/**
		 * The accessible name for the copy button, rendered as its `aria-label`
		 * (like the `alt` text on an `<img>`).
		 *
		 * @default "Copy data as Markdown"
		 */
		label?: string;
		/**
		 * Callback fired after a successful copy, passes the serialized markdown.
		 */
		onCopy?: (value: string) => void;
		/**
		 * Callback fired when an error occurs during copying.
		 */
		onCopyError?: (error: unknown) => void;
	};

/**
 * A button that copies the chart's current data to the clipboard as a
 * GitHub-flavored markdown table. Columns mirror the sr-only data table twin:
 * x first, one column per composed series in paint order, and the z column on
 * 3D scatters. Output is machine-stable (ISO 8601 dates, un-separated
 * numbers, em dash gaps) so the paste target — Slack, an issue, a
 * spreadsheet, an LLM chat — receives parseable data, not locale formatting.
 *
 * The data is serialized at click time, so the copy always reflects the
 * chart's current rows.
 */
const ChartCopyButtonPrimitive = ({
	partName,
	slotName,
	label = "Copy data as Markdown",
	onCopy,
	onCopyError,
	onClick,
	ref,
	"data-slot": dataSlot,
	...props
}: CopyButtonPrimitiveProps & { partName: string; slotName: string }) => {
	const context = useChartContext(partName);
	const copyToClipboard = useCopyToClipboard();
	// Why one state: the check icon shows exactly while the region reads "Copied".
	// `alternateAnnouncement` makes a repeat inside the reset window a real DOM
	// change, so a second copy is announced again.
	const [announcement, setAnnouncement] = useState("");
	const wasCopied = announcement !== "";
	const announceToggle = useRef(false);
	const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (timeoutHandle.current != null) {
				clearTimeout(timeoutHandle.current);
			}
		};
	}, []);

	return (
		<>
			<IconButton
				type="button"
				appearance="ghost"
				intent="neutral"
				size="sm"
				data-slot={joinDataSlot(dataSlot, `${slotName}-copy-button`)}
				label={label}
				icon={
					<IconSwap
						active={wasCopied ? "check" : "copy"}
						icons={{ check: <CheckIcon />, copy: <CopyIcon /> }}
					/>
				}
				ref={ref}
				onClick={async (event) => {
					try {
						// Why braced guards: React Compiler 1.0 skips a component whose
						// `try` block holds an optional call.
						if (onClick != null) {
							onClick(event);
						}
						if (event.defaultPrevented) {
							// The consumer took over the click, so cancel any pending revert and
							// return the icon to its idle copy state, rather than stranding the
							// check icon left over from a prior copy.
							if (timeoutHandle.current != null) {
								clearTimeout(timeoutHandle.current);
								timeoutHandle.current = undefined;
							}
							setAnnouncement("");
							return;
						}
						const { data, xKey, xScale, zKey } = context.dataRef.current;
						const markdown = serializeChartMarkdown({
							data,
							xKey,
							xScale,
							zKey,
							series: context.store.getSnapshot().series,
						});
						await copyToClipboard(markdown);
						if (onCopy != null) {
							onCopy(markdown);
						}
						setAnnouncement(alternateAnnouncement("Copied", announceToggle));
						if (timeoutHandle.current != null) {
							clearTimeout(timeoutHandle.current);
						}
						timeoutHandle.current = setTimeout(() => {
							setAnnouncement("");
						}, 2000);
					} catch (error) {
						onCopyError?.(error);
					}
				}}
				{...props}
			/>
			{/* Why always mounted: the icon swap is silent to a screen reader. A
			    lone text child is written with textContent, which is safe under a
			    browser translation engine, and a fresh live region is not
			    announced on mount. */}
			<LiveRegion>{announcement}</LiveRegion>
		</>
	);
};

export type {
	//,
	CopyButtonPrimitiveProps,
};

export {
	//,
	ChartCopyButtonPrimitive,
};

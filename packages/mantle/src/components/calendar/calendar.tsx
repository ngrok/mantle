"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import type { ChevronProps, ClassNames } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import { cx } from "../../utils/cx/cx.js";
import { iconButtonVariants } from "../button/icon-button-variants.js";
import { Icon } from "../icon/icon.js";

/**
 * Props for `Calendar`: every `DayPicker` prop. `showOutsideDays` defaults to
 * `false` here, and `className` lands on the calendar root alongside any
 * `classNames.root` you pass.
 */
type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Shared ghost icon-button styling for the calendar's previous/next
 * navigation buttons, computed once at module scope.
 */
const calendarNavButtonClasses = iconButtonVariants({
	appearance: "ghost",
	intent: "neutral",
	size: "sm",
});

/**
 * The caret inside each navigation button. `DayPicker` derives `orientation`
 * from the button's direction and the `dir` prop.
 */
function CalendarChevron({ orientation }: ChevronProps) {
	const icon = orientation === "left" ? <CaretLeftIcon /> : <CaretRightIcon />;

	return <Icon svg={icon} className="size-4" />;
}

// Why module scope: `DayPicker` memoizes its date model on the identity of
// `components` and `classNames`. It renders `components.Chevron` as an element
// type. A per-render object misses that memo on every `Calendar` render. A
// per-render `Chevron` remounts both navigation carets.
const calendarComponents = { Chevron: CalendarChevron } as const;

const calendarClassNames = {
	button_next: cx(calendarNavButtonClasses, "absolute right-0"),
	button_previous: cx(calendarNavButtonClasses, "absolute left-0"),
	caption_label: "text-sm font-medium",
	day_button: "day size-full rounded-md not-aria-selected:not-disabled:hover:bg-filled-accent/15",
	disabled: "text-muted opacity-50",
	hidden: "invisible",
	month: "space-y-4",
	month_caption: "flex justify-center pt-1 relative items-center",
	month_grid: "w-full border-collapse space-y-1",
	months: "flex flex-col sm:flex-row gap-y-4 sm:gap-x-4 sm:gap-y-0 relative max-w-min",
	nav: "flex items-center absolute inset-x-0 top-1 h-5 justify-between z-10",
	outside: "day-outside aria-selected:text-on-filled opacity-50 text-muted",
	range_end: "day-range-end [&:not(.day-range-start)]:rounded-l-none",
	range_middle:
		"day-range-middle not-disabled:aria-selected:bg-filled-accent/15 aria-selected:text-strong rounded-none not-disabled:aria-selected:hover:bg-filled-accent/25",
	range_start: "day-range-start [&:not(.day-range-end)]:rounded-r-none",
	selected: "not-disabled:bg-filled-accent text-on-filled not-disabled:hover:bg-filled-accent",
	today:
		"not-aria-selected:not-disabled:text-accent-600 font-medium not-aria-selected:not-disabled:bg-filled-accent/10 rounded-md",
	week: "flex w-full mt-1",
	weekday: "text-body w-7 text-[0.8rem] text-center font-normal",
	weekdays: "flex",
} as const satisfies Partial<ClassNames>;

/**
 * A calendar component that allows users to select a date or a range of dates.
 * Renders a month grid with previous/next navigation; it has no text entry.
 *
 * **Server rendering.** If you omit `today`, `DayPicker` reads the clock during
 * render, once on the server and again in the browser. If the two clocks or
 * time zones disagree on the date, the `today` cell and its `Today, …` label
 * land on different days. React then reports a hydration mismatch. If you also
 * omit `month` and `defaultMonth`, the grid can open on a different month.
 * Under SSR, pass `today` and `defaultMonth` (or `month`) from one
 * request-scoped date. `timeZone` aligns the zone only, not the clock.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"calendar"` | The calendar root. |
 *
 * @preview The API is not stable and may change. There may also be bugs.
 * Please file an issue at https://github.com/ngrok/mantle/issues if you find any.
 *
 * @see https://mantle.ngrok.com/components/preview/calendar
 *
 * @example
 * ```tsx
 * <Calendar
 *   mode="single"
 *   selected={selectedDate}
 *   onSelect={setSelectedDate}
 * />
 *
 * <Calendar
 *   mode="range"
 *   selected={dateRange}
 *   onSelect={setDateRange}
 * />
 * ```
 */
function Calendar({ className, classNames, showOutsideDays = false, ...props }: CalendarProps) {
	const mode = props.mode;
	const mergedClassNames = useMemo(() => {
		const { root, ...rest } = classNames ?? {};

		return {
			...calendarClassNames,
			// Why both: DayPicker's own `className` contract targets the root, and
			// a consumer `classNames.root` must add to it, not erase it.
			root: cx("isolate", className, root),
			day: cx(
				"overflow-hidden text-center text-sm p-0 relative focus-within:relative focus-within:z-20 size-7 rounded-md",
				mode === "range" &&
					"first:has-aria-selected:rounded-l-md last:has-aria-selected:rounded-r-md",
			),
			...rest,
		};
	}, [className, classNames, mode]);

	return (
		<DayPicker
			data-slot="calendar"
			animate={false}
			components={calendarComponents}
			classNames={mergedClassNames}
			showOutsideDays={showOutsideDays}
			{...props}
		/>
	);
}

export {
	//,
	Calendar,
};

export type {
	//,
	CalendarProps,
};

export type {
	//,
	DateRange,
} from "react-day-picker";

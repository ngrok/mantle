"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { cx } from "../../utils/cx/cx.js";
import { baseIconButtonClasses, iconButtonVariants } from "../button/icon-button.js";
import { Icon } from "../icon/icon.js";

type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * A calendar component that allows users to select a date or a range of dates.
 *
 * @preview This component is in `preview` mode which means the API is not stable and may change.
 * There may also be bugs! Please file an issue if you find any! <3
 *
 * @see https://mantle.ngrok.com/components/calendar#api-calendar
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
 *
 * https://github.com/ngrok-oss/mantle/issues
 */
function Calendar({ className, classNames, showOutsideDays = false, ...props }: CalendarProps) {
	return (
		<DayPicker
			data-slot="calendar"
			animate={false}
			components={{
				Chevron: (iconProps) => {
					const icon = iconProps.orientation === "left" ? <CaretLeftIcon /> : <CaretRightIcon />;

					return <Icon svg={icon} className="size-4" />;
				},
			}}
			classNames={{
				root: cx("isolate", className),
				button_next: cx(
					baseIconButtonClasses,
					iconButtonVariants({ appearance: "ghost", size: "sm" }),
					"absolute right-0",
				),
				button_previous: cx(
					baseIconButtonClasses,
					iconButtonVariants({ appearance: "ghost", size: "sm" }),
					"absolute left-0",
				),
				caption_label: "text-sm font-medium",
				day: cx(
					"overflow-hidden text-center text-sm p-0 relative focus-within:relative focus-within:z-20 size-7 rounded-md",
					props.mode === "range"
						? "first:has-aria-selected:rounded-l-md last:has-aria-selected:rounded-r-md"
						: "",
				),
				day_button:
					"day size-full rounded-md not-aria-selected:not-disabled:hover:bg-filled-accent/15",
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
				selected:
					"not-disabled:bg-filled-accent text-on-filled not-disabled:hover:bg-filled-accent",
				today:
					"not-aria-selected:not-disabled:text-accent-600 font-medium not-aria-selected:not-disabled:bg-filled-accent/10 rounded-md",
				week: "flex w-full mt-1",
				weekday: "text-body w-7 text-[0.8rem] text-center font-normal",
				weekdays: "flex",
				...classNames,
			}}
			showOutsideDays={showOutsideDays}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

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

import { IconButton } from "@ngrok/mantle/button";
import { Calendar, type DateRange } from "@ngrok/mantle/calendar";
import { Popover } from "@ngrok/mantle/popover";
import { CalendarIcon } from "@phosphor-icons/react/Calendar";
import { useState } from "react";

/**
 * Calendar in a popover demo.
 */
export function PopoverCalendarExample() {
	const [date, setDate] = useState<Date | undefined>(undefined);

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<IconButton
					type="button"
					appearance="outlined"
					intent="neutral"
					icon={<CalendarIcon />}
					label="Open calendar popover"
				/>
			</Popover.Trigger>
			<Popover.Content>
				<Calendar mode="single" onSelect={(value) => setDate(value)} selected={date} />
			</Popover.Content>
		</Popover.Root>
	);
}

/**
 * Single date selection calendar demo.
 */
export function SingleCalendarExample() {
	const [date, setDate] = useState<Date | undefined>(undefined);

	return (
		<Calendar
			mode="single"
			selected={date}
			onSelect={setDate}
			className="border-card rounded-md border p-2 shadow-md"
		/>
	);
}

/**
 * Range date selection calendar demo.
 */
export function RangeCalendarExample() {
	const [date, setDate] = useState<DateRange | undefined>({
		from: undefined,
		to: undefined,
	});

	return (
		<Calendar
			mode="range"
			defaultMonth={date?.from}
			selected={date}
			onSelect={setDate}
			className="border-card rounded-md border p-2 shadow-md"
		/>
	);
}

/**
 * Range date selection with multiple months calendar demo.
 */
export function RangeMultipleCalendarExample() {
	const [date, setDate] = useState<DateRange | undefined>({
		from: undefined,
		to: undefined,
	});

	return (
		<Calendar
			mode="range"
			defaultMonth={date?.from}
			selected={date}
			onSelect={setDate}
			numberOfMonths={2}
			className="border-card rounded-md border p-2 shadow-md"
		/>
	);
}

/**
 * Calendar demo with hidden days.
 */
export function HiddenDaysCalendarExample() {
	const [date, setDate] = useState<DateRange | undefined>({
		from: undefined,
		to: undefined,
	});
	const hiddenDays = [new Date(2024, 4, 6), new Date(2024, 4, 20), new Date(2024, 4, 11)];

	return (
		<Calendar
			mode="range"
			defaultMonth={hiddenDays[0]}
			selected={date}
			onSelect={setDate}
			hidden={hiddenDays}
			className="border-card rounded-md border p-2 shadow-md"
		/>
	);
}

/**
 * Calendar demo with disabled days.
 */
export function DisabledDaysCalendarExample() {
	const [date, setDate] = useState<DateRange | undefined>({
		from: undefined,
		to: undefined,
	});
	const disabledDays = [new Date(2024, 4, 3), new Date(2024, 4, 13), new Date(2024, 4, 14)];

	return (
		<Calendar
			mode="range"
			defaultMonth={disabledDays[0]}
			selected={date}
			onSelect={setDate}
			disabled={disabledDays}
			className="border-card rounded-md border p-2 shadow-md"
		/>
	);
}

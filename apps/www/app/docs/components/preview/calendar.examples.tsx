import {
	DisabledDaysCalendarExample,
	HiddenDaysCalendarExample,
	PopoverCalendarExample,
	RangeCalendarExample,
	RangeMultipleCalendarExample,
	ServerRenderedCalendarExample,
	SingleCalendarExample,
} from "~/features/calendar-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Calendar docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SingleCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Popover" example on the Calendar docs page. */
export function PopoverExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<PopoverCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Range" example on the Calendar docs page. */
export function RangeExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<RangeCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Range with multiple months" example on the Calendar docs page. */
export function RangeWithMultipleMonthsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<RangeMultipleCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Hidden days" example on the Calendar docs page. */
export function HiddenDaysExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<HiddenDaysCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Disabled days" example on the Calendar docs page. */
export function DisabledDaysExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<DisabledDaysCalendarExample />
		</PreviewCanvas>
	);
}

/** The "Server rendering" example on the Calendar docs page. */
export function ServerRenderingExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ServerRenderedCalendarExample />
		</PreviewCanvas>
	);
}

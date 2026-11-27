import { StatusStrip } from "@ngrok/mantle/status-strip";

import { PreviewCanvas } from "~/components/preview-canvas";

/** In stock (1), sold out (0), or no reading (`null`), for each hour of one day. */
const hours: readonly (0 | 1 | null)[] = [
	1,
	1,
	1,
	1,
	1,
	1,
	0,
	0,
	0,
	1,
	1,
	1,
	null,
	null,
	1,
	1,
	1,
	1,
	1,
	0,
	1,
	1,
	1,
	1,
];

/** The share of each day's hours in stock, or `null` for a day with no report. */
const days: readonly (number | null)[] = [
	1,
	1,
	0.9,
	0.75,
	0.4,
	0,
	0,
	0.2,
	0.6,
	1,
	1,
	null,
	null,
	1,
	0.95,
	1,
	1,
	0.5,
	0.3,
	1,
	1,
	1,
	0.85,
	1,
	1,
	1,
	0,
	0.1,
	0.7,
	1,
];

function hourTitle(hour: number, inStock: 0 | 1 | null) {
	const time = `${String(hour).padStart(2, "0")}:00 UTC`;
	if (inStock == null) {
		return `${time}: no reading`;
	}
	return `${time}: ${inStock === 1 ? "in stock" : "sold out"}`;
}

/** The first example on the Status Strip docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col items-stretch">
			<StatusStrip.Root aria-label="In stock 18 of the 22 hours with a reading on Nov 26">
				{hours.map((inStock, hour) => (
					<StatusStrip.Cell
						// oxlint-disable-next-line react/no-array-index-key -- Why: each hour is a fixed position in the day, so its index is its identity.
						key={hour}
						value={inStock}
						title={hourTitle(hour, inStock)}
					/>
				))}
			</StatusStrip.Root>
		</PreviewCanvas>
	);
}

/** The "Shares between 0 and 1" example on the Status Strip docs page. */
export function SharesExample() {
	return (
		<PreviewCanvas className="flex-col items-stretch">
			<StatusStrip.Root aria-label="At the low price 13 of the last 24 hours">
				<StatusStrip.Cell value={1} title="00:00 to 05:00 UTC: at the low 6 of 6 hours" />
				<StatusStrip.Cell value={0.5} title="06:00 to 11:00 UTC: at the low 3 of 6 hours" />
				<StatusStrip.Cell value={1 / 6} title="12:00 to 17:00 UTC: at the low 1 of 6 hours" />
				<StatusStrip.Cell value={0.5} title="18:00 to 23:00 UTC: at the low 3 of 6 hours" />
			</StatusStrip.Root>
		</PreviewCanvas>
	);
}

/** The "No data" example on the Status Strip docs page. */
export function NoDataExample() {
	return (
		<PreviewCanvas className="flex-col items-stretch">
			<StatusStrip.Root aria-label="Up 2 of the 3 hours with a reading">
				<StatusStrip.Cell value={1} title="09:00 UTC: up" />
				<StatusStrip.Cell value={0} title="10:00 UTC: down" />
				<StatusStrip.Cell value={null} title="11:00 UTC: no reading" />
				<StatusStrip.Cell value={1} title="12:00 UTC: up" />
			</StatusStrip.Root>
		</PreviewCanvas>
	);
}

/** The "Beside text that says the same thing" example on the Status Strip docs page. */
export function DecorativeExample() {
	return (
		<PreviewCanvas className="flex-col items-start">
			<p className="text-body text-sm">In stock 72% of hours, last 30 days</p>
			<StatusStrip.Root aria-hidden className="mt-1.5 h-4 auto-cols-1.5 gap-0.5">
				{days.map((share, day) => (
					<StatusStrip.Cell
						// oxlint-disable-next-line react/no-array-index-key -- Why: each day is a fixed position in the window, so its index is its identity.
						key={day}
						value={share}
					/>
				))}
			</StatusStrip.Root>
		</PreviewCanvas>
	);
}

/** The "Colors" example on the Status Strip docs page. */
export function ColorsExample() {
	return (
		<PreviewCanvas className="flex-col items-stretch">
			<StatusStrip.Root
				aria-label="In stock 18 of the 22 hours with a reading on Nov 26"
				className="[--status-strip-fill:var(--color-success-600)]"
			>
				{hours.map((inStock, hour) => (
					<StatusStrip.Cell
						// oxlint-disable-next-line react/no-array-index-key -- Why: each hour is a fixed position in the day, so its index is its identity.
						key={hour}
						value={inStock}
						title={hourTitle(hour, inStock)}
					/>
				))}
			</StatusStrip.Root>
		</PreviewCanvas>
	);
}

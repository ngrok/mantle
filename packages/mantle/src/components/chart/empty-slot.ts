import type { PaintContext } from "./paint-backend.js";
import type { PlotRect } from "./renderer.js";
import type { BandLayout } from "./scales.js";
import { BAR_CORNER_RADIUS, cornerRadius, hairline } from "./renderer.js";
import { bandStart } from "./scales.js";

/**
 * The paint of `BarChart.EmptySlot`. Only that part imports this module, so a
 * chart that does not compose it ships none of this code.
 *
 * This module is internal shared implementation. The package does not export it.
 */

/**
 * How far an empty slot reaches from the baseline, as a share of the plot. It
 * is a fixed length, not a value on the axis, so it reads as a slot at any
 * scale and never moves the y domain.
 */
const EMPTY_SLOT_SHARE = 0.3;

/** What the engine knows about one bar paint, which places the slots. */
type EmptySlotPaintInput = {
	/** The upper end of each series' segment for each row: `NaN` where the row has no value. */
	segments: ReadonlyArray<{ upper: Float64Array }>;
	layout: BandLayout;
	plot: PlotRect;
	rowCount: number;
	/** The width of a row's bars across the band, so a slot spans grouped bars too. */
	across: number;
	/** The zero baseline, in CSS pixels on the value axis. */
	baseline: number;
	horizontal: boolean;
	color: string;
};

/**
 * Outline each empty slot: a row where no series has a value. A slot spans
 * the row's bars across the band and {@link EMPTY_SLOT_SHARE} of the plot
 * from the baseline, in one batched 1px stroke. A row of zeros is a reading,
 * so it paints no slot.
 */
const paintEmptySlots = (ctx: PaintContext, input: EmptySlotPaintInput): void => {
	const { segments, layout, plot, rowCount, across, baseline, horizontal, color } = input;
	const span = horizontal ? plot.width : plot.height;
	// Why a side: on a chart with negative values, zero sits inside or at the
	// far edge of the plot. A slot grows toward the positive side when it fits
	// there, else toward the side with more room, and never leaves the plot.
	const positiveRoom = horizontal ? plot.left + plot.width - baseline : baseline - plot.top;
	const positive = positiveRoom >= EMPTY_SLOT_SHARE * span || positiveRoom >= span - positiveRoom;
	const length = Math.min(EMPTY_SLOT_SHARE * span, positive ? positiveRoom : span - positiveRoom);
	// Every slot of a paint has one size, so the corner radius and its radii
	// list come once for each paint, not once for each row. Why the 1px trim: a
	// stroke centers on its path, so the path sits half a pixel inside the slot.
	// A slot that grows right or down starts at the baseline.
	const valueStart = positive === horizontal ? baseline : baseline - length;
	const width = Math.max(0, Math.round(horizontal ? length : across) - 1);
	const height = Math.max(0, Math.round(horizontal ? across : length) - 1);
	const radius = cornerRadius({
		radius: BAR_CORNER_RADIUS,
		thickness: Math.min(width, height),
		length: Math.max(width, height),
	});
	const radii = [radius, radius, radius, radius];
	let painted = false;
	for (let index = 0; index < rowCount; index++) {
		let empty = true;
		for (const segment of segments) {
			if (!Number.isNaN(segment.upper[index] ?? Number.NaN)) {
				empty = false;
				break;
			}
		}
		if (!empty) {
			continue;
		}
		if (!painted) {
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.beginPath();
			painted = true;
		}
		const bandEdge = bandStart(layout, index) + (layout.bandwidth - across) / 2;
		// Why the `min`: `hairline` rounds to the pixel grid, and on a band
		// under a pixel wide, rounding up moves the stroke into the next band.
		const x = horizontal ? valueStart : bandEdge;
		const y = horizontal ? bandEdge : valueStart;
		ctx.roundRect(
			Math.min(hairline(x), x + (horizontal ? length : across) - 0.5),
			Math.min(hairline(y), y + (horizontal ? across : length) - 0.5),
			width,
			height,
			radii,
		);
	}
	if (painted) {
		ctx.stroke();
	}
};

export type {
	//,
	EmptySlotPaintInput,
};
export {
	//,
	paintEmptySlots,
};

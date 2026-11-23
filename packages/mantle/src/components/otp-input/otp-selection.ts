/**
 * The selection of the one-time passcode input, in characters. It is also the
 * set of slots that show as active.
 */
type OtpSelection = {
	start: number;
	end: number;
	direction: "forward" | "backward" | "none";
};

/**
 * The value of `data-otp-state`, which every conditional slot and group style reads:
 * - `"idle"`: no slot active (input not focused)
 * - `"caret"`: exactly one slot active (typing caret)
 * - `"range"`: more than one slot active, but not all
 * - `"all"`: every slot active (select-all)
 */
type OtpState = "idle" | "caret" | "range" | "all";

/**
 * Returns the selection the input takes so that a caret on a filled slot
 * selects that slot, and the next character replaces it. A range, a caret
 * after the last character of a short value, and an empty value stay as they
 * are. `previous` is the last selection this function returned; it decides
 * which side of the caret an arrow key moved to.
 *
 * @example
 * ```ts
 * // ArrowLeft from the end of a full six-character value.
 * slotSelection({
 * 	selection: { start: 5, end: 5, direction: "none" },
 * 	length: 6,
 * 	maxLength: 6,
 * 	previous: { start: 5, end: 6, direction: "backward" },
 * }); // { start: 4, end: 5, direction: "backward" }
 * ```
 */
const slotSelection = ({
	selection,
	length,
	maxLength,
	previous,
}: {
	selection: OtpSelection;
	length: number;
	maxLength: number;
	previous: OtpSelection | null;
}): OtpSelection => {
	const { start } = selection;
	if (length === 0 || start !== selection.end || (start === length && length < maxLength)) {
		return selection;
	}
	if (start === 0) {
		return { start: 0, end: 1, direction: "forward" };
	}
	if (start === maxLength) {
		return { start: start - 1, end: start, direction: "backward" };
	}
	if (maxLength < 2 || length < 2) {
		return selection;
	}
	if (previous == null) {
		return { start, end: start + 1, direction: selection.direction };
	}
	const direction = start < previous.end ? "backward" : "forward";
	// Why: a caret that moved back from a selected slot selects the slot before
	// it. A caret that moved back from the insert position is already on it.
	const wasInserting = previous.start === previous.end && previous.start < maxLength;
	const offset = direction === "backward" && !wasInserting ? -1 : 0;
	return { start: start + offset, end: start + offset + 1, direction };
};

/**
 * Whether the slot at `index` is active: the caret is on it, or the selection
 * covers it.
 *
 * @example
 * ```ts
 * isSlotActive({ selection: { start: 2, end: 4, direction: "none" }, index: 3 }); // true
 * ```
 */
const isSlotActive = ({
	selection,
	index,
}: {
	selection: OtpSelection | null;
	index: number;
}): boolean => {
	if (selection == null) {
		return false;
	}
	if (selection.start === selection.end) {
		return index === selection.start;
	}
	return index >= selection.start && index < selection.end;
};

/**
 * Maps the count of active slots to the `data-otp-state` value.
 *
 * @example
 * ```ts
 * otpState({ selection: { start: 0, end: 6, direction: "none" }, maxLength: 6 }); // "all"
 * ```
 */
const otpState = ({
	selection,
	maxLength,
}: {
	selection: OtpSelection | null;
	maxLength: number;
}): OtpState => {
	if (selection == null) {
		return "idle";
	}
	const active =
		selection.start === selection.end
			? Number(selection.start < maxLength)
			: Math.min(selection.end, maxLength) - selection.start;
	if (active <= 0) {
		return "idle";
	}
	if (active === 1) {
		return "caret";
	}
	if (active === maxLength) {
		return "all";
	}
	return "range";
};

export {
	//,
	isSlotActive,
	otpState,
	slotSelection,
};

export type {
	//,
	OtpSelection,
};

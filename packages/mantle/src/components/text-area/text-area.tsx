"use client";

import type { ComponentProps, ComponentRef } from "react";
import { useRef, useState } from "react";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { $cssProperties } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";

type Props = ComponentProps<"textarea"> &
	WithValidation & {
		/**
		 * The visual style of the textarea.
		 */
		appearance?: "monospaced";
	} & WithDataSlot;

/**
 * A multi-line plain-text editing control, useful when you want to allow users
 * to enter a sizeable amount of free-form text, for example a comment on a
 * review or feedback form.
 *
 * The field grows with its text up to `max-h-60`, then scrolls. Its minimum
 * height is `rows` lines, such as `rows={1}` or `rows={2}` for a compact
 * field, or `6rem` without `rows`. A drag on the resize handle cannot make it
 * shorter than that minimum.
 *
 * @useWhen Accept several lines of free-form text, such as a comment or a description.
 *
 * @siblings
 * - `Input`: the text fits on one line.
 *
 * @see https://mantle.ngrok.com/components/forms/text-area
 *
 * @example
 * ```tsx
 * <form>
 *   <div>
 *     <Label htmlFor="feedback">Feedback:</Label>
 *     <TextArea
 *       id="feedback"
 *       name="feedback"
 *       placeholder="Enter your feedback here"
 *     />
 *   </div>
 * </form>
 * ```
 */
const TextArea = ({
	"data-slot": dataSlot,
	appearance,
	"aria-invalid": _ariaInvalid,
	className,
	onDragEnter,
	onDragLeave,
	onDropCapture,
	ref,
	rows,
	style,
	validation: _validation,
	...props
}: Props) => {
	// Why `isFinite` and `>= 1`: React omits `NaN` and a `rows` below 1, and the browser ignores `Infinity`.
	const minRows = rows != null && Number.isFinite(rows) && rows >= 1 ? Math.trunc(rows) : undefined;
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});
	const [isDragOver, setIsDragOver] = useState(false);
	const innerRef = useRef<ComponentRef<"textarea">>(null);
	const composedRef = useComposedRefs(innerRef, ref);

	return (
		<textarea
			aria-invalid={ariaInvalid}
			data-validation={validation || undefined}
			data-slot={joinDataSlot(dataSlot, "text-area")}
			className={cx(
				"bg-form data-drag-over:border-dashed data-drag-over:ring-4 pointer-coarse:py-[calc(--spacing(2.5)-1px)] pointer-coarse:text-base text-sm flex field-sizing-content max-h-60 w-full rounded-md border px-3 py-[calc(--spacing(2)-1px)] focus-visible:outline-hidden focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
				"placeholder:text-placeholder data-drag-over:border-dashed",
				"border-form text-strong ring-focus-accent focus:border-accent-600 data-drag-over:border-accent-600",
				"data-[validation=error]:border-danger-600 data-[validation=error]:ring-focus-danger data-[validation=error]:focus-visible:border-danger-600 data-[validation=error]:data-drag-over:border-danger-600 motion-safe:data-[validation=error]:animate-shake",
				"data-[validation=success]:border-success-600 data-[validation=success]:ring-focus-success data-[validation=success]:focus-visible:border-success-600 data-[validation=success]:data-drag-over:border-success-600",
				"data-[validation=warning]:border-warning-600 data-[validation=warning]:ring-focus-warning data-[validation=warning]:focus-visible:border-warning-600 data-[validation=warning]:data-drag-over:border-warning-600",
				appearance === "monospaced" && "font-mono pointer-coarse:text-base text-xs/5",
				// Why a minimum height: `field-sizing-content` ignores `rows`. The sums add the vertical padding and border, and a caller `min-h-*` replaces the one `min-h` class on every pointer.
				minRows == null
					? "min-h-24"
					: "min-h-(--_text-area-min) [--_text-area-min:calc(var(--_text-area-rows)*1lh+(--spacing(4)))] pointer-coarse:[--_text-area-min:calc(var(--_text-area-rows)*1lh+(--spacing(5)))]",
				className,
			)}
			data-drag-over={isDragOver ? "" : undefined}
			onDragEnter={(event) => {
				setIsDragOver(true);
				onDragEnter?.(event);
			}}
			onDragLeave={(event) => {
				setIsDragOver(false);
				onDragLeave?.(event);
			}}
			onDropCapture={(event) => {
				setIsDragOver(false);
				innerRef.current?.focus();
				onDropCapture?.(event);
			}}
			ref={composedRef}
			// Why `rows` too: browsers without `field-sizing` size the field from it.
			rows={rows}
			style={minRows == null ? style : $cssProperties({ "--_text-area-rows": minRows, ...style })}
			{...props}
		/>
	);
};

export {
	//,
	TextArea,
};

export type {
	//,
	Props as TextAreaProps,
};

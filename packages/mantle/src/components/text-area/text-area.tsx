"use client";

import type { ComponentProps, ComponentRef } from "react";
import { forwardRef, useRef, useState } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithValidation } from "../input/types.js";

type Props = ComponentProps<"textarea"> &
	WithValidation & {
		/**
		 * The visual style of the textarea.
		 */
		appearance?: "monospaced";
	};

/**
 * A multi-line plain-text editing control, useful when you want to allow users
 * to enter a sizeable amount of free-form text, for example a comment on a
 * review or feedback form.
 *
 * @see https://mantle.ngrok.com/components/text-area
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
const TextArea = forwardRef<ComponentRef<"textarea">, Props>(
	(
		{
			appearance,
			"aria-invalid": _ariaInvalid,
			className,
			onDragEnter,
			onDragLeave,
			onDropCapture,
			validation: _validation,
			...props
		},
		ref,
	) => {
		const isInvalid = _ariaInvalid != null && _ariaInvalid !== "false";
		const validation = isInvalid
			? "error"
			: typeof _validation === "function"
				? _validation()
				: _validation;
		const ariaInvalid = _ariaInvalid ?? validation === "error";
		const [isDragOver, setIsDragOver] = useState(false);
		const innerRef = useRef<ComponentRef<"textarea">>(null);

		return (
			<textarea
				aria-invalid={ariaInvalid}
				data-validation={validation || undefined}
				data-slot="text-area"
				className={cx(
					appearance === "monospaced" &&
						"pointer-coarse:text-[0.9375rem] font-mono text-[0.8125rem]",
					"border-input bg-form data-drag-over:border-dashed data-drag-over:ring-4 pointer-coarse:py-[calc(theme(spacing[2.5])-1px)] pointer-coarse:text-base flex min-h-24 w-full rounded-md border px-3 py-[calc(theme(spacing[2])-1px)] focus-visible:outline-hidden focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
					"placeholder:text-placeholder data-drag-over:border-dashed",
					"border-form text-strong ring-focus-accent focus:border-accent-600 data-drag-over:border-accent-600",
					"data-validation-error:border-danger-600 data-validation-error:ring-focus-danger data-validation-error:focus-visible:border-danger-600 data-validation-error:data-drag-over:border-danger-600",
					"data-validation-success:border-success-600 data-validation-success:ring-focus-success data-validation-success:focus-visible:border-success-600 data-validation-success:data-drag-over:border-success-600",
					"data-validation-warning:border-warning-600 data-validation-warning:ring-focus-warning data-validation-warning:focus-visible:border-warning-600 data-validation-warning:data-drag-over:border-warning-600",
					className,
				)}
				data-drag-over={isDragOver}
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
				ref={composeRefs(innerRef, ref)}
				{...props}
			/>
		);
	},
);
TextArea.displayName = "TextArea";

export {
	//,
	TextArea,
};

export type {
	//,
	Props as TextAreaProps,
};

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";

type LabelProps = ComponentProps<"label"> & {
	/**
	 * If set, the label will appear disabled.
	 */
	disabled?: boolean;
};

/**
 * A caption for a form control — input, checkbox, radio, switch, select.
 * Renders a native `<label>`. Pair every form control with a `Label` so the
 * control has an accessible name, clicks on the label focus the control, and
 * screen readers announce the field correctly.
 *
 * **When to use**
 * - Every visible form control. Always.
 * - Above or beside an input to describe it ("Email", "API key").
 * - Wrapping a checkbox or radio next to its descriptive text.
 *
 * **When not to use**
 * - For static UI text that isn't labeling a control — use a heading or
 *   plain `<p>`/`<span>`.
 * - As a substitute for `aria-label` on non-`<input>` widgets that don't
 *   support `<label for>` association.
 *
 * **Two ways to associate.** Either wrap the control inside the `<Label>`
 * (implicit association — simplest) or set `htmlFor` to the control's `id`
 * (explicit — required when the control isn't a child).
 *
 * **Disabled state.** Pass `disabled` to render the label in a disabled
 * style. Typically you'll want this to mirror the underlying control's
 * disabled state so the visual treatment stays consistent.
 *
 * **Font weight.** A `Label` automatically gets `font-medium` when it does
 * **not** contain a nested form control (`<input>`, `<textarea>`, `<select>`,
 * `<button>`, or `[contenteditable]`). When the label *does* wrap a control,
 * the auto default is intentionally skipped so the control's own typography
 * isn't bolded — apply `font-medium` to your own caption element (e.g. a
 * `<span>` or `<p>`) inside the label. Override the default at any time by
 * passing a font-weight utility on the `Label` itself, e.g.
 * `<Label className="font-bold">`.
 *
 * @see https://mantle.ngrok.com/components/forms/label
 *
 * @example
 * ```tsx
 * import { Label } from "@ngrok/mantle/label";
 * import { Input } from "@ngrok/mantle/input";
 *
 * // Implicit — control nested inside the label.
 * <Label className="grid gap-1">
 *   <span>Email</span>
 *   <Input type="email" name="email" />
 * </Label>
 *
 * // Explicit — htmlFor matches the control's id.
 * <div className="grid gap-1">
 *   <Label htmlFor="api-key">API key</Label>
 *   <Input id="api-key" name="apiKey" />
 * </div>
 *
 * // Inline label for a checkbox.
 * <Label className="flex items-center gap-2">
 *   <Checkbox name="terms" />
 *   <span>I agree to the terms</span>
 * </Label>
 * ```
 */
const Label = ({
	"aria-disabled": _ariaDisabled,
	children,
	className,
	disabled,
	onMouseDown,
	ref,
	...props
}: LabelProps) => (
	<label
		aria-disabled={disabled ?? _ariaDisabled}
		data-slot="label"
		className={cx(
			"text-strong cursor-pointer text-sm peer-disabled:cursor-default has-disabled:cursor-default aria-disabled:cursor-default font-sans",
			// Default to font-medium when the label isn't wrapping a form control. The
			// arbitrary variant wraps the *entire* matched selector — class + the
			// `:not(:has(...))` check — in `:where()`, flattening total specificity to 0.
			// That lets a user-supplied font-weight utility (`font-bold`, `font-normal`,
			// etc.) at (0,1,0) override cleanly, even though `[contenteditable]` is an
			// attribute selector that would otherwise lift the rule to (0,1,0) and tie.
			"[:where(&:not(:has(input,textarea,select,button,[contenteditable])))]:font-medium",
			className,
		)}
		onMouseDown={(event) => {
			// only prevent text selection if clicking inside the label itself
			const target = event.target as HTMLElement;
			if (target.closest("button, input, select, textarea")) {
				return;
			}

			onMouseDown?.(event);

			// prevent text selection when double clicking label
			if (!event.defaultPrevented && event.detail > 1) {
				event.preventDefault();
			}
		}}
		ref={ref}
		{...props}
	>
		{children}
	</label>
);

export {
	//
	Label,
};

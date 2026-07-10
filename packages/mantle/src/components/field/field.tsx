import { QuestionIcon } from "@phosphor-icons/react/Question";
import {
	cloneElement,
	type ComponentRef,
	type ComponentProps,
	forwardRef,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useId,
	useMemo,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { IconButton, type IconButtonProps } from "../button/icon-button.js";
import { Label } from "../label/label.js";
import { Popover } from "../popover/index.js";
import { Slot } from "../slot/index.js";
import {
	FieldControlContext,
	FieldItemContext,
	resolveFieldControlAriaProps,
	type FieldControlAriaProps,
} from "./field-context.js";
import {
	hasRenderableErrorListChildren,
	isErrorItemRenderable,
	normalizeErrorMessages,
	type FieldErrorMessage,
} from "./error-helpers.js";
import { FieldValidationProvider, resolveValidation, type WithValidation } from "./validation.js";

/**
 * Renders a semantic `<fieldset>` for grouping related controls under a
 * single accessible name. Resets the default browser fieldset chrome
 * (border, padding, `min-width` quirk) so it composes cleanly with
 * `Field.Legend` and `Field.Group`. Always renders a real `<fieldset>` so
 * the grouping semantics cannot be accidentally removed.
 *
 * Reach for `Field.Set` when the grouping carries semantic weight — most
 * commonly a `RadioGroup` (where the legend names the question the radios
 * answer) or a set of related checkboxes. For laying out unrelated fields
 * with consistent spacing, prefer `Field.Group` on its own.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Set>
 *   <Field.Legend>Notification frequency</Field.Legend>
 *   <RadioGroup.Root name="frequency" defaultValue="daily">
 *     <RadioGroup.Item value="daily" id="freq-daily">…</RadioGroup.Item>
 *     <RadioGroup.Item value="weekly" id="freq-weekly">…</RadioGroup.Item>
 *   </RadioGroup.Root>
 * </Field.Set>
 * ```
 */
const FieldSet = forwardRef<ComponentRef<"fieldset">, ComponentProps<"fieldset">>(
	({ className, ...props }, ref) => {
		return (
			<fieldset
				ref={ref}
				data-slot="field-set"
				className={cx("flex w-full min-w-0 flex-col gap-4 border-0 p-0", className)}
				{...props}
			/>
		);
	},
);
FieldSet.displayName = "FieldSet";

/**
 * The caption for a `Field.Set`. Always renders a semantic `<legend>` styled
 * to match the `Label` component so a fieldset reads like a section header,
 * and gives screen readers an accessible name for the surrounding group
 * (e.g. "Notification frequency, group, Daily").
 *
 * **Spacing.** Has a default `mb-1.5` so the legend sits 6px above the next
 * sibling — matching the figma. We use a margin (not the parent `Field.Set`'s
 * flex `gap`) because `<legend>` has special browser rendering inside a
 * `<fieldset>` that ignores the parent's flex `gap`. Override the default
 * with any `mb-*` utility on `Field.Legend`.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Set>
 *   <Field.Legend>Notification frequency</Field.Legend>
 *   <RadioGroup.Root name="frequency" defaultValue="daily">
 *     <RadioGroup.Item value="daily" id="freq-daily">…</RadioGroup.Item>
 *     <RadioGroup.Item value="weekly" id="freq-weekly">…</RadioGroup.Item>
 *   </RadioGroup.Root>
 * </Field.Set>
 * ```
 */
const Legend = forwardRef<ComponentRef<"legend">, ComponentProps<"legend">>(
	({ className, ...props }, ref) => {
		return (
			<legend
				ref={ref}
				data-slot="field-legend"
				// `mb-1.5` (not the parent's `gap-*`) drives the Legend ↔ next-sibling
				// spacing because `<legend>` has special browser rendering inside a
				// `<fieldset>` that ignores the parent's flex `gap`. Pairs with
				// RadioGroup.Item's own `py-1` for a 10px text-bottom-to-radio rhythm
				// matching the figma. Override with any `mb-*` utility on Field.Legend.
				className={cx("text-strong mb-1.5 text-sm font-medium font-sans", className)}
				{...props}
			/>
		);
	},
);
Legend.displayName = "FieldLegend";

/**
 * Caption for a `Field.Item`. Renders the Mantle `Label` with the same
 * `htmlFor`, click-to-focus, disabled, and typography behavior — but inside a
 * `Field.Item`, the label-to-control association is automatic: `Field.Item`
 * generates a stable control id, `Field.Control` splats that id onto its
 * focusable child, and `Field.Label` consumes the same id as the default
 * `htmlFor`. The required `name` on `Field.Item` is the single source of truth
 * for the control's form name — no matching `htmlFor` / `id` pair, no separate
 * `useId()` call.
 *
 * Pass an explicit `htmlFor` to opt out — for example when the focusable
 * element is rendered outside of `Field.Control` and the auto-generated id
 * never lands on it.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * // htmlFor is wired automatically from Field.Item's name.
 * <Field.Item name="apiKey">
 *   <Field.Label>API key</Field.Label>
 *   <Field.Control>
 *     <Input />
 *   </Field.Control>
 * </Field.Item>
 *
 * // Opt out with an explicit htmlFor when needed.
 * <Field.Item name="legacy">
 *   <Field.Label htmlFor="legacy-control">Legacy field</Field.Label>
 *   <input id="legacy-control" />
 * </Field.Item>
 * ```
 */
const FieldLabel = forwardRef<ComponentRef<"label">, ComponentProps<typeof Label>>(
	({ htmlFor, ...props }, ref) => {
		const context = useContext(FieldItemContext);

		return <Label ref={ref} htmlFor={htmlFor ?? context?.controlId} {...props} />;
	},
);
FieldLabel.displayName = "FieldLabel";

/**
 * Static, label-styled text for a `Field.Item` row that does **not** caption a
 * focusable form control. Renders a `<p>` (not a `<label>`) with the same
 * typography as `Field.Label`, so a read-only row inside a sheet or details
 * panel composes cleanly next to real form fields without misrepresenting
 * itself as a control caption.
 *
 * **When to use**
 * - A `Field.Item` row that displays a derived or system-managed value
 *   (owner, created-at, computed status) where there is no `<input>`,
 *   `<select>`, `<button>`, or other focusable target to label.
 * - Read-only summary rows inside a sheet or detail panel that should
 *   visually align with sibling `Field.Item`s but have no editable control.
 * - Anywhere you would otherwise hand-roll a `<p>` styled to mimic
 *   `Field.Label` typography — prefer this so intent is explicit at the call site.
 *
 * **When not to use**
 * - The row has a focusable control (input, select, checkbox, switch,
 *   button trigger). Use `Field.Label` so the click-to-focus and
 *   accessible-name association are wired correctly.
 * - For body copy, section headings, or any text whose typography happens
 *   to look similar by accident — use the appropriate heading or `<p>`
 *   directly. `Field.LabelText` exists specifically to slot into the
 *   `Field.Label` position of a `Field.Item`.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Item name="owner">
 *   <Field.LabelText>Owner</Field.LabelText>
 *   <CredentialOwnerCard owner={owner} />
 *   <Field.Description>The user or service user that owns this API key.</Field.Description>
 * </Field.Item>
 * ```
 */
const LabelText = forwardRef<ComponentRef<"p">, ComponentProps<"p"> & WithAsChild>(
	({ asChild, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "p";

		return (
			<Comp
				ref={ref}
				data-slot="field-label-text"
				className={cx("text-strong text-sm font-medium font-sans", className)}
				{...props}
			/>
		);
	},
);
LabelText.displayName = "FieldLabelText";

/**
 * Horizontal layout container for the label area of a field. Aligns a
 * `<Field.Label>` (which may contain `Field.Optional`) with adjacent affordances
 * like a help-icon `Popover.Trigger` on a shared center line with a tight
 * `gap-1`. Center-alignment is used (not baseline) so SVG icon buttons —
 * which have no text baseline — sit visually centered next to the label
 * text rather than dropping to the box bottom.
 *
 * Use this when the label needs sibling decorations that can't live inside
 * the `<Field.Label>` itself (e.g. an interactive help button — clicking inside a
 * `<label>` would forward focus to the associated control). For a label
 * with only an `(Optional)` suffix, place `Field.Optional` directly inside
 * the `<Field.Label>` instead — no `LabelRow` needed.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const LabelRow = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";

		return (
			<Comp
				ref={ref}
				data-slot="field-label-row"
				className={cx("flex items-center gap-1", className)}
				{...props}
			/>
		);
	},
);
LabelRow.displayName = "FieldLabelRow";

/**
 * `Popover.Root` re-export for the help-affordance pattern. Pair with
 * `Field.HelpTrigger` (renders a default question-mark `IconButton`) and
 * `Field.HelpContent` (the popover body) to drop a help button into a
 * `Field.LabelRow` without manually wiring `Popover` + `IconButton` +
 * `QuestionIcon`. All `Popover.Root` props are forwarded — pass `modal`,
 * `defaultOpen`, etc. as needed.
 *
 * Popover (not Tooltip) so the affordance is reachable on touch devices.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Help = Popover.Root;

const defaultHelpTriggerIcon = <QuestionIcon />;

/**
 * Props for the default help popover trigger. A contextual label is required
 * so repeated help affordances do not all share the same accessible name.
 */
type FieldHelpTriggerProps = Partial<Omit<IconButtonProps, "icon" | "label">> &
	Pick<IconButtonProps, "label"> & {
		/**
		 * The icon to render inside the trigger button. Defaults to a Phosphor
		 * `QuestionIcon` so the most common case only needs a contextual label.
		 */
		icon?: ReactNode;
	};

/**
 * The trigger for a `Field.Help` popover — a `Popover.Trigger` wired to a
 * ghost-appearance `IconButton` with a default Phosphor `QuestionIcon`.
 * Requires a contextual screen-reader label, and accepts `icon` or other
 * `IconButton` props for visual customization.
 *
 * Pre-styled with `text-body` (matching the figma) so the icon reads as
 * subtle metadata at rest; `IconButton`'s ghost `hover:text-strong` still
 * brightens it on interaction. Carries a default `-my-0.5` so the 24px
 * `xs` button keeps a full click target while contributing only 20px to
 * the `Field.LabelRow` flex line — matching the label's text line-height
 * so the label text is not pushed off-center.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const HelpTrigger = forwardRef<ComponentRef<"button">, FieldHelpTriggerProps>(
	(
		{
			appearance = "ghost",
			className,
			icon = defaultHelpTriggerIcon,
			label,
			size = "xs",
			type = "button",
			...props
		},
		ref,
	) => (
		<Popover.Trigger asChild>
			<IconButton
				ref={ref}
				appearance={appearance}
				// `-my-0.5` keeps the 24px (`size-6`) `xs` IconButton click target while
				// trimming 4px (2px each side) off its flex-line contribution so the row
				// height matches the label's 20px line-height. Without this the trigger
				// drives the LabelRow to 24px and pushes the label text down 2px.
				className={cx("text-body -my-0.5", className)}
				icon={icon}
				label={label}
				size={size}
				type={type}
				{...props}
			/>
		</Popover.Trigger>
	),
);
HelpTrigger.displayName = "FieldHelpTrigger";

/**
 * The popover body for a `Field.Help`. Wraps `Popover.Content` so all
 * positioning / sizing options (`side`, `align`, `preferredWidth`, etc.)
 * work as expected, and overrides the inherited `data-slot` to
 * `field-help-content` so consumers can target it as part of a `Field`
 * subtree without colliding with other popovers.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const HelpContent = forwardRef<ComponentRef<"div">, ComponentProps<typeof Popover.Content>>(
	(props, ref) => <Popover.Content ref={ref} data-slot="field-help-content" {...props} />,
);
HelpContent.displayName = "FieldHelpContent";

/**
 * Inline "(Optional)" suffix to mark a field as optional. Defaults to the
 * literal string `(Optional)` so the common case is `<Field.Optional />` with
 * no children — pass children to translate or replace the text. Renders a
 * `<span>` in `text-muted` at `text-sm` / `font-normal` so it reads as
 * secondary metadata next to the bolder Label text.
 *
 * Place inside the `<Field.Label>` so screen readers announce it as part of the
 * accessible name (e.g. "Email, Optional, edit text"). Pair with a small
 * `gap` on the label's flex layout, or rely on the natural inline spacing.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Optional = forwardRef<ComponentRef<"span">, ComponentProps<"span"> & WithAsChild>(
	({ asChild, children, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "span";

		return (
			<Comp
				ref={ref}
				data-slot="field-optional"
				className={cx("text-muted text-sm font-normal font-sans", className)}
				{...props}
			>
				{children ?? "(Optional)"}
			</Comp>
		);
	},
);
Optional.displayName = "FieldOptional";

/**
 * Layout container that stacks multiple `Field.Item`s vertically with
 * `gap-4` between them. This is the default way to compose multiple fields
 * — most forms only need a `Field.Group` of `Field.Item`s. Reach for
 * `Field.Set` + `Field.Legend` only when the grouping carries semantic
 * weight (e.g. a `RadioGroup` or related checkboxes).
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Group = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";

		return (
			<Comp
				ref={ref}
				data-slot="field-group"
				className={cx("flex w-full flex-col gap-4", className)}
				{...props}
			/>
		);
	},
);
Group.displayName = "FieldGroup";

/**
 * A single form field — `Label`, a control (`Input`, `Select`, `Checkbox`,
 * etc.), and any `Field.Description`, `Field.Errors`, or `Field.ErrorList` siblings stacked
 * vertically with a consistent `gap-1.5` so help and error messaging sit
 * tightly under the input.
 *
 * Renders a plain `<div>` — the `<label htmlFor>` ↔ control association
 * already provides the right semantics for a single field, so no implicit
 * `role` is added. `Field.Item` owns the contextual description/error IDs
 * that `Field.Control` applies to the focusable control. Rendered errors
 * infer an `"error"` validation state unless `validation` is supplied as an
 * explicit override.
 *
 * **Single-slot constraint.** A `Field.Item` owns one description ID and one
 * errors ID, so render at most one `Field.Description` and one
 * `Field.Errors` *or* `Field.ErrorList` (not both) per item. A second instance
 * would duplicate the slot `id` in the DOM. Pass multiple messages to
 * `Field.Errors`, or multiple `Field.ErrorItem` children to `Field.ErrorList`,
 * instead.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
type FieldItemProps = ComponentProps<"div"> &
	WithAsChild &
	WithValidation & {
		/**
		 * Form-value name for the field. Required so `Field.Control` can splat
		 * it onto the focusable child while `Field.Item` owns the stable
		 * generated control id used by `Field.Label`'s `htmlFor`.
		 */
		name: string;
	};

const Item = forwardRef<ComponentRef<"div">, FieldItemProps>(
	({ asChild, children, className, name, validation: validationProp, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";
		const controlId = useId();
		const descriptionId = useId();
		const errorId = useId();
		const [hasErrors, setHasErrors] = useState(false);
		const validation = resolveValidation(validationProp ?? (hasErrors ? "error" : undefined));

		const registerError = useCallback(() => {
			setHasErrors(true);

			return () => {
				setHasErrors(false);
			};
		}, []);

		const context = useMemo(
			() => ({
				controlId,
				descriptionId,
				errorId,
				hasErrors,
				name,
				registerError,
				validation,
			}),
			[controlId, descriptionId, errorId, hasErrors, name, registerError, validation],
		);

		return (
			<FieldItemContext.Provider value={context}>
				<FieldValidationProvider validation={validation}>
					<Comp
						ref={ref}
						data-slot="field-item"
						data-validation={validation}
						className={cx("flex w-full flex-col gap-1.5", className)}
						{...props}
					>
						{children}
					</Comp>
				</FieldValidationProvider>
			</FieldItemContext.Provider>
		);
	},
);
Item.displayName = "FieldItem";

type FieldControlSlotProps = Omit<
	ComponentProps<typeof Slot>,
	"aria-describedby" | "aria-errormessage" | "aria-invalid" | "children"
>;

/**
 * Element-child form of `Field.Control`. Renders via `Slot`, so it accepts
 * any HTML/Slot props and a forwarded ref — those land on the single child
 * element along with the generated ARIA props.
 */
type FieldControlElementProps = FieldControlSlotProps & {
	/**
	 * A single control element to receive the field ARIA props.
	 */
	children: ReactElement;
};

/**
 * Render-prop form of `Field.Control`. The caller owns the rendered element,
 * so `Field.Control` itself renders nothing — extra DOM props and `ref` have
 * no element to attach to and are intentionally not part of this variant.
 * Slot props are marked `never` so passing e.g. `className` alongside a
 * render-prop child is a type error rather than a silently ignored prop.
 */
type FieldControlRenderProps = {
	/**
	 * A render function that places the field ARIA props onto a control of
	 * the caller's choosing. Used for compound controls or wrappers where
	 * `Slot` cannot reach the focusable element.
	 */
	children: (props: FieldControlAriaProps) => ReactNode;
} & { [K in keyof FieldControlSlotProps]?: never };

/**
 * Props for `Field.Control`. A discriminated union over how the caller
 * supplies the focusable element:
 *
 * - `FieldControlElementProps` — pass a single React element child and
 *   `Field.Control` clones the generated ARIA props onto it via `Slot`.
 *   Accepts the full Slot prop surface plus a forwarded ref.
 * - `FieldControlRenderProps` — pass a render function that receives the
 *   ARIA props and places them on a control of the caller's choosing. The
 *   caller owns the rendered element, so DOM/Slot props and `ref` are
 *   excluded from this variant at the type level.
 *
 * @example
 * ```tsx
 * // Element form — Slot splats id, name, and ARIA props onto <Input/>
 * <Field.Item name="email">
 *   <Field.Control>
 *     <Input type="email" />
 *   </Field.Control>
 * </Field.Item>
 *
 * // Render-prop form — caller spreads the props onto its own element
 * <Field.Item name="acceptTerms">
 *   <Field.Control>
 *     {(controlProps) => (
 *       <label>
 *         Accept terms
 *         <input type="checkbox" {...controlProps} />
 *       </label>
 *     )}
 *   </Field.Control>
 * </Field.Item>
 * ```
 */
type FieldControlProps = FieldControlElementProps | FieldControlRenderProps;

/**
 * Applies `Field.Item` description, error, and validation state to a single
 * focusable control. It always behaves like an `asChild` slot: pass one child
 * element to receive the generated ARIA props, or use a function child to
 * place those props manually. Mantle compound controls that consume
 * `FieldControlContext` can be wrapped at the root when their docs show that
 * composition; otherwise use the render-prop form to place the generated props
 * on the actual focusable element.
 *
 * `Field.Item` owns the full control contract — `id`, `name`, `aria-*`, and
 * `validation` all flow down from the surrounding `Field.Item` and overwrite
 * anything passed on the child. To override these values, set them on
 * `Field.Item` itself (e.g. `<Field.Item validation="error">`); to opt out of
 * the contract entirely, render your control without `Field.Control`.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Control = forwardRef<HTMLElement, FieldControlProps>(({ children, ...props }, ref) => {
	const context = useContext(FieldItemContext);
	// Field.Item owns id, name, aria-*, and validation — `cloneElement` below
	// overwrites whatever the child supplied, and the resolver no longer reads
	// child-side overrides. To override any of these, set them on Field.Item.
	const controlState = resolveFieldControlAriaProps({ context });

	if (typeof children === "function") {
		return (
			<FieldValidationProvider validation={controlState.validation}>
				<FieldControlContext.Provider value={context ? controlState.ariaProps : null}>
					{children(controlState.ariaProps)}
				</FieldControlContext.Provider>
			</FieldValidationProvider>
		);
	}

	invariant(
		isValidElement<FieldControlAriaProps>(children),
		"Field.Control expects a single React element child (or a render-prop function). Got a non-element value (string, array, fragment, null, or undefined). Wrap the control in a single element, or use the function child form: <Field.Control>{(props) => <YourControl {...props} />}</Field.Control>.",
	);

	// Both `cloneElement` and `FieldControlContext` flow the same resolved
	// props. `cloneElement` covers the simple case (Input, native input) where
	// the direct child is the focusable element. `FieldControlContext` covers
	// compound widgets like Select / MultiSelect, where the direct child is a
	// context provider (e.g. `Select.Root`) that does not forward ARIA props
	// to its inner focusable trigger — that trigger reads the context itself.
	return (
		<FieldValidationProvider validation={controlState.validation}>
			<FieldControlContext.Provider value={context ? controlState.ariaProps : null}>
				<Slot ref={ref} {...props}>
					{cloneElement(children, controlState.ariaProps)}
				</Slot>
			</FieldControlContext.Provider>
		</FieldValidationProvider>
	);
});
Control.displayName = "FieldControl";

/**
 * Helper / hint text. Renders a `<p>` in the muted body color so it reads
 * as secondary to the bolder content above it. Use inside `Field.Item`, below
 * the control, to clarify expected format or constraints for that single field.
 *
 * **At most one per `Field.Item`.** `Field.Item` owns a single description
 * slot ID and applies it via context, so a second `Field.Description` would
 * duplicate that `id` in the DOM.
 *
 * **Auto-tighten.** When this description sits directly after rendered
 * `Field.Errors` or `Field.ErrorList` output, the parent's `gap-1.5`
 * collapses via a matching negative top margin so error list + helper read as
 * one tight block. Pass any margin utility (`mt-1`, `mt-0`, etc.) to override
 * — the rule's specificity is flattened to `(0,1,0)` so a single user class wins.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Description = forwardRef<ComponentRef<"p">, Omit<ComponentProps<"p">, "id"> & WithAsChild>(
	({ asChild, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "p";
		const context = useContext(FieldItemContext);

		return (
			<Comp
				ref={ref}
				data-slot="field-description"
				id={context?.descriptionId}
				className={cx(
					"text-body text-sm leading-4",
					// When this description sits directly after a Field.ErrorList
					// sibling, collapse the parent's gap-1.5 with a matching negative
					// top margin so the list + helper read as one tight block.
					// Wrapping the matched selector in :where() flattens its specificity
					// to (0,1,0) so a user-supplied margin utility (mt-2, mt-0, etc.)
					// passed on Field.Description still overrides cleanly.
					"[:where([data-slot=field-error-list]+&)]:-mt-1.5",
					className,
				)}
				{...props}
			/>
		);
	},
);
Description.displayName = "FieldDescription";

/**
 * A single error message list item for a field. Renders an `<li>` in
 * `text-danger-600` so it stands out from a sibling `Field.Description`.
 * Must be rendered inside a `Field.ErrorList`. Empty or blank children render
 * nothing so message-less validator results do not produce empty list items.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="username">
 *     <Field.Label>Username</Field.Label>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.ErrorList>
 *       <Field.ErrorItem>Must be at least 3 characters.</Field.ErrorItem>
 *       <Field.ErrorItem>Use letters, numbers, hyphens, or underscores.</Field.ErrorItem>
 *     </Field.ErrorList>
 *     <Field.Description>Pick something memorable.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const FieldErrorItem = forwardRef<ComponentRef<"li">, ComponentProps<"li">>(
	({ children, className, ...props }, ref) => {
		if (!isErrorItemRenderable(children)) {
			return null;
		}

		return (
			<li
				ref={ref}
				data-slot="field-error"
				className={cx("text-danger-600 text-sm leading-4", className)}
				{...props}
			>
				{children}
			</li>
		);
	},
);
FieldErrorItem.displayName = "FieldErrorItem";

/**
 * Props for the `Field.Errors` convenience renderer. It owns its generated
 * children, so use `Field.ErrorList` / `Field.ErrorItem` directly when custom
 * list contents or polymorphic list markup are needed.
 */
type FieldErrorsProps = Omit<ComponentProps<"ul">, "children" | "id"> & {
	/**
	 * Validation messages to render. Strings are trimmed, and empty, nullish,
	 * or false values are ignored before rendering the list.
	 */
	messages?: readonly FieldErrorMessage[];
};

/**
 * Convenience renderer for string validation messages. Trims each message,
 * filters empty values, and renders a semantic `Field.ErrorList` containing
 * one `Field.ErrorItem` per remaining message.
 *
 * Accepts strings directly so product code can map any validation library's
 * error shape into messages without coupling Mantle to that library.
 * Deliberately does not support `asChild` because it owns the generated list
 * items; use `Field.ErrorList` with `asChild` for custom list markup.
 *
 * **At most one per `Field.Item`.** `Field.Errors` renders a `Field.ErrorList`
 * under the hood, and `Field.Item` owns a single errors slot ID. Use either
 * `Field.Errors` *or* `Field.ErrorList` per item, not both, and pass multiple
 * messages to one `Field.Errors` instead of rendering it twice.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const FieldErrors = forwardRef<ComponentRef<"ul">, FieldErrorsProps>(
	({ messages, ...props }, ref) => (
		<FieldErrorList ref={ref} {...props}>
			{normalizeErrorMessages(messages).map((message) => (
				<FieldErrorItem key={message}>{message}</FieldErrorItem>
			))}
		</FieldErrorList>
	),
);
FieldErrors.displayName = "FieldErrors";

/**
 * Wraps one or more `Field.ErrorItem` children in a semantic `<ul>` with
 * `role="list"` so a list of validation errors is announced as a list by
 * screen readers, including Safari/VoiceOver combinations that drop list
 * semantics when list styling is removed. Renders nothing when no children are
 * passed, or when all `Field.ErrorItem` children are empty.
 *
 * The list strips its default browser styling (`list-none`, `p-0`, `m-0`) and
 * stacks items as a flex column with no gap so consecutive errors read as a
 * single tight block.
 *
 * **At most one per `Field.Item`.** `Field.Item` owns a single errors slot ID
 * and applies it via context. Use either `Field.ErrorList` *or* `Field.Errors`
 * per item, not both, and put multiple `Field.ErrorItem` children inside the
 * single list instead of rendering two `Field.ErrorList`s.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="username">
 *     <Field.Label>Username</Field.Label>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.ErrorList>
 *       <Field.ErrorItem>Must be at least 3 characters.</Field.ErrorItem>
 *       <Field.ErrorItem>Use letters, numbers, hyphens, or underscores.</Field.ErrorItem>
 *     </Field.ErrorList>
 *     <Field.Description>Pick something memorable.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const FieldErrorList = forwardRef<
	ComponentRef<"ul">,
	Omit<ComponentProps<"ul">, "id"> & WithAsChild
>(({ asChild, children, className, ...props }, ref) => {
	const hasRenderableChildren = hasRenderableErrorListChildren({
		children,
		errorItemType: FieldErrorItem,
	});
	const context = useContext(FieldItemContext);
	const registerError = context?.registerError;

	useIsomorphicLayoutEffect(() => {
		if (!hasRenderableChildren || registerError == null) {
			return;
		}

		return registerError();
	}, [hasRenderableChildren, registerError]);

	if (!hasRenderableChildren) {
		return null;
	}

	const Comp = asChild ? Slot : "ul";

	return (
		<Comp
			ref={ref}
			data-slot="field-error-list"
			id={context?.errorId}
			role="list"
			className={cx("m-0 flex w-full flex-col list-none p-0", className)}
			{...props}
		>
			{children}
		</Comp>
	);
});
FieldErrorList.displayName = "FieldErrorList";

/**
 * Compound component for semantic, accessible form fields. Composes a
 * `Field.Label`, control (`Input`, `Select`, etc.), `Field.Description`, and
 * validation errors (`Field.Errors` / `Field.ErrorList` + `Field.ErrorItem`)
 * with consistent spacing and ARIA wiring. Stack multiple fields with
 * `Field.Group`; use `Field.Set` + `Field.Legend` for radios / related
 * checkboxes that share one accessible name.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * Composition:
 * ```
 * Field.Group
 * └── Field.Item
 *     ├── Field.LabelRow
 *     │   ├── Field.Label            (or Field.LabelText for control-less rows)
 *     │   │   └── Field.Optional
 *     │   └── Field.Help
 *     │       ├── Field.HelpTrigger
 *     │       └── Field.HelpContent
 *     ├── Field.Control
 *     │   └── (control)
 *     ├── Field.Errors             (or)
 *     ├── Field.ErrorList
 *     │   └── Field.ErrorItem
 *     └── Field.Description
 * ```
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Field = {
	/**
	 * A single form field. Provides message IDs and validation state to
	 * `Field.Control`; rendered errors infer `"error"` validation.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Item,
	/**
	 * Applies generated field ARIA props and validation state to a single
	 * focusable control. Accepts either a single React element child (cloned
	 * via `Slot`) or a render-prop child that receives the ARIA props for
	 * cases where `Slot` cannot reach the focusable element — for example a
	 * `<label>`-wrapped native checkbox, or a third-party component that
	 * needs the props placed manually on an inner input.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * // Element child — Slot splats id, name, and ARIA props onto <Input/>.
	 * <Field.Item name="apiKey">
	 *   <Field.Label>API key</Field.Label>
	 *   <Field.Control>
	 *     <Input />
	 *   </Field.Control>
	 *   <Field.Errors messages={["API key is required."]} />
	 * </Field.Item>
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Render-prop child — caller spreads the props onto an inner element
	 * // when the focusable target is nested (e.g. inside a <label>).
	 * <Field.Item name="acceptTerms">
	 *   <Field.Control>
	 *     {(controlProps) => (
	 *       <label>
	 *         Accept terms
	 *         <input type="checkbox" {...controlProps} />
	 *       </label>
	 *     )}
	 *   </Field.Control>
	 *   <Field.Errors messages={["You must accept the terms."]} />
	 * </Field.Item>
	 * ```
	 */
	Control,
	/**
	 * Layout container that stacks multiple `Field.Item`s vertically.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Group,
	/**
	 * Semantic `<fieldset>` for related controls that share one accessible
	 * name from `Field.Legend`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Set>
	 *   <Field.Legend>Notification frequency</Field.Legend>
	 *   <RadioGroup.Root name="frequency" defaultValue="daily">
	 *     <RadioGroup.Item value="daily" id="freq-daily">…</RadioGroup.Item>
	 *     <RadioGroup.Item value="weekly" id="freq-weekly">…</RadioGroup.Item>
	 *   </RadioGroup.Root>
	 * </Field.Set>
	 * ```
	 */
	Set: FieldSet,
	/**
	 * Caption for `Field.Set`. Renders a semantic `<legend>`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Set>
	 *   <Field.Legend>Notification frequency</Field.Legend>
	 *   <RadioGroup.Root name="frequency" defaultValue="daily">
	 *     <RadioGroup.Item value="daily" id="freq-daily">…</RadioGroup.Item>
	 *     <RadioGroup.Item value="weekly" id="freq-weekly">…</RadioGroup.Item>
	 *   </RadioGroup.Root>
	 * </Field.Set>
	 * ```
	 */
	Legend,
	/**
	 * The Mantle `Label`, exposed on `Field` for field composition. Inside a
	 * `Field.Item`, `htmlFor` defaults to the same stable id that `Field.Control`
	 * splats onto its focusable child — so the label-to-control association is
	 * automatic from `Field.Item`'s required `name` and you don't need to thread
	 * a matching `htmlFor` / `id` pair by hand. Pass an explicit `htmlFor` to
	 * opt out (e.g. when the focusable element is rendered outside of
	 * `Field.Control`).
	 *
	 * @see https://mantle.ngrok.com/components/forms/label
	 *
	 * @example
	 * ```tsx
	 * // htmlFor is wired automatically from Field.Item's name.
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Label: FieldLabel,
	/**
	 * Static, label-styled text for a `Field.Item` row that has no focusable
	 * control to caption. Renders a `<p>` with the same typography as
	 * `Field.Label`, so a read-only row composes cleanly alongside real form
	 * fields without misrepresenting itself as a control caption.
	 *
	 * Use for derived / system-managed values (owner, created-at, computed
	 * status) inside sheets or detail panels. For rows with a real control,
	 * use `Field.Label` instead so the label-to-control association is wired.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Item name="owner">
	 *   <Field.LabelText>Owner</Field.LabelText>
	 *   <CredentialOwnerCard owner={owner} />
	 *   <Field.Description>The user or service user that owns this API key.</Field.Description>
	 * </Field.Item>
	 * ```
	 */
	LabelText,
	/**
	 * Horizontal layout container for the label area of a field. Aligns a
	 * `<Field.Label>` (which may contain `Field.Optional`) with adjacent affordances
	 * like a help-icon `Popover.Trigger` on a shared center line with `gap-1`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	LabelRow,
	/**
	 * `Popover.Root` re-export for the help-affordance pattern. Pair with
	 * `Field.HelpTrigger` and `Field.HelpContent` to drop a `?` button next to
	 * a label without manually composing Popover + IconButton + QuestionIcon.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Help,
	/**
	 * Trigger for a `Field.Help` popover — a ghost `IconButton` with a default
	 * `QuestionIcon`. Requires a contextual `label`; pass `icon` to swap the
	 * glyph, or other `IconButton` props (`size`, `appearance`, etc.) to customize.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	HelpTrigger,
	/**
	 * Body of a `Field.Help` popover. Re-exports `Popover.Content` so all
	 * positioning / sizing options (`side`, `align`, `preferredWidth`, etc.)
	 * work as expected.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	HelpContent,
	/**
	 * Inline "(Optional)" suffix to mark a field as optional. Default content
	 * is `(Optional)`; pass children to translate or replace it. Place inside
	 * the `<Field.Label>` so screen readers announce it as part of the accessible
	 * name.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Optional,
	/**
	 * Helper / hint text rendered below the control in the muted body color.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Description,
	/**
	 * Convenience renderer for validation messages. Trims string messages,
	 * filters empty values, and renders a `Field.ErrorList` with one
	 * `Field.ErrorItem` for each remaining message.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="apiKey">
	 *     <Field.LabelRow>
	 *       <Field.Label>
	 *         API key <Field.Optional />
	 *       </Field.Label>
	 *       <Field.Help>
	 *         <Field.HelpTrigger label="What is an API key?" />
	 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
	 *       </Field.Help>
	 *     </Field.LabelRow>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.Errors messages={["API key is required."]} />
	 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	Errors: FieldErrors,
	/**
	 * Wraps one or more `Field.ErrorItem` children in a semantic `<ul>`.
	 * Renders nothing when given no renderable children.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="username">
	 *     <Field.Label>Username</Field.Label>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.ErrorList>
	 *       <Field.ErrorItem>Must be at least 3 characters.</Field.ErrorItem>
	 *       <Field.ErrorItem>Use letters, numbers, hyphens, or underscores.</Field.ErrorItem>
	 *     </Field.ErrorList>
	 *     <Field.Description>Pick something memorable.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	ErrorList: FieldErrorList,
	/**
	 * A single error message list item for a field. Renders an `<li>` in
	 * `text-danger-600` and must be nested inside a `Field.ErrorList`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/field
	 *
	 * @example
	 * ```tsx
	 * <Field.Group>
	 *   <Field.Item name="username">
	 *     <Field.Label>Username</Field.Label>
	 *     <Field.Control>
	 *       <Input />
	 *     </Field.Control>
	 *     <Field.ErrorList>
	 *       <Field.ErrorItem>Must be at least 3 characters.</Field.ErrorItem>
	 *       <Field.ErrorItem>Use letters, numbers, hyphens, or underscores.</Field.ErrorItem>
	 *     </Field.ErrorList>
	 *     <Field.Description>Pick something memorable.</Field.Description>
	 *   </Field.Item>
	 * </Field.Group>
	 * ```
	 */
	ErrorItem: FieldErrorItem,
} as const;

export {
	//,
	Field,
};

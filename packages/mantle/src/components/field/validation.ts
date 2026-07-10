import {
	createContext,
	createElement,
	useContext,
	type AriaAttributes,
	type ReactNode,
} from "react";

/**
 * The shared validation state vocabulary for Mantle form controls.
 *
 * `false` is useful with short-circuiting logic, e.g.
 *
 * ```tsx
 * validation={errors.length > 0 && "error"}
 * ```
 */
type Validation = "error" | "success" | "warning" | false;

/**
 * A resolved visual validation state. Unlike `Validation`, this excludes
 * `false` because parsed validation normalizes the absence value to
 * `undefined`.
 */
type ValidationState = Exclude<Validation, false>;

/**
 * A validation prop value accepted by Mantle controls. The function form is
 * useful when validation state is expensive or should be read lazily from
 * nearby state.
 */
type ValidationProp = Validation | (() => Validation);

/**
 * Props for Mantle controls that accept a validation state.
 */
type WithValidation = {
	/**
	 * Visual validation state for the control. `validation="error"` also maps
	 * to `aria-invalid=true` unless an explicit `aria-invalid` prop is present.
	 */
	validation?: ValidationProp;
};

/**
 * The React-supported value type for the `aria-invalid` attribute.
 */
type AriaInvalid = AriaAttributes["aria-invalid"];

/**
 * Options used to resolve a control's visual validation state and matching
 * `aria-invalid` value.
 */
type ParseValidationOptions = {
	/**
	 * The explicit ARIA invalid state supplied by the consumer or inherited
	 * from a parent control context.
	 */
	"aria-invalid"?: AriaInvalid;
	/**
	 * The control's visual validation state.
	 */
	validation?: ValidationProp;
	/**
	 * When true, neutral controls resolve `ariaInvalid` to `false` instead of
	 * leaving it unset. This preserves the historical behavior of most Mantle
	 * inputs while still allowing components like `OtpInput` to omit it.
	 */
	defaultAriaInvalid?: boolean;
};

/**
 * The normalized validation state Mantle controls use for DOM attributes and
 * validation styling.
 */
type ParsedValidation = {
	/**
	 * `true` when the resolved ARIA invalid state represents any invalid value.
	 */
	isInvalid: boolean;
	/**
	 * The resolved value to pass to `aria-invalid`.
	 */
	ariaInvalid: AriaInvalid | undefined;
	/**
	 * The resolved visual validation state. `false` is normalized away.
	 */
	validation: ValidationState | undefined;
};

const FieldValidationContext = createContext<ValidationState | undefined>(undefined);

/**
 * Provides a resolved field validation state to Mantle controls rendered
 * inside a `Field.Item` or `Field.Control`.
 */
const FieldValidationProvider = ({
	children,
	validation,
}: {
	children?: ReactNode;
	validation?: ValidationState;
}) => createElement(FieldValidationContext.Provider, { value: validation }, children);

/**
 * Reads the nearest resolved field validation state, when a Mantle control is
 * composed inside `Field.Item` / `Field.Control`.
 */
const useFieldValidation = () => useContext(FieldValidationContext);

/**
 * Returns `true` when an `aria-invalid` value represents an invalid control.
 * ARIA treats any value except `false` as an invalid state, including
 * `"grammar"` and `"spelling"`.
 */
const isAriaInvalid = (ariaInvalid: AriaInvalid | undefined) =>
	ariaInvalid != null && ariaInvalid !== false && ariaInvalid !== "false";

/**
 * Resolves a `validation` prop to a concrete validation state and normalizes
 * `false` to `undefined` so it can be used directly with `data-validation`.
 */
const resolveValidation = (validation: ValidationProp | undefined) =>
	(typeof validation === "function" ? validation() : validation) || undefined;

/**
 * Resolves the shared Mantle validation contract for form controls.
 *
 * Explicit invalid ARIA state wins and forces visual `"error"` styling.
 * Otherwise, `validation="error"` maps to `aria-invalid=true`, and neutral
 * controls receive `aria-invalid=false` unless `defaultAriaInvalid` is false.
 */
const parseValidation = ({
	"aria-invalid": ariaInvalid,
	defaultAriaInvalid = true,
	validation: validationProp,
}: ParseValidationOptions): ParsedValidation => {
	const explicitInvalid = isAriaInvalid(ariaInvalid);
	const validation = explicitInvalid ? "error" : resolveValidation(validationProp);
	const resolvedAriaInvalid =
		ariaInvalid ?? (validation === "error" ? true : defaultAriaInvalid ? false : undefined);

	return {
		isInvalid: isAriaInvalid(resolvedAriaInvalid),
		ariaInvalid: resolvedAriaInvalid,
		validation,
	};
};

export {
	//,
	FieldValidationProvider,
	isAriaInvalid,
	parseValidation,
	resolveValidation,
	useFieldValidation,
};
export type {
	//,
	AriaInvalid,
	ParsedValidation,
	Validation,
	ValidationProp,
	ValidationState,
	WithValidation,
};

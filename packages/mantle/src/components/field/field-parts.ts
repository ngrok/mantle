/**
 * The parts of the `Field` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Item,
	Control,
	Group,
	FieldSet as Set,
	Legend,
	FieldLabel as Label,
	LabelText,
	LabelRow,
	Help,
	HelpTrigger,
	HelpContent,
	Optional,
	Description,
	FieldErrors as Errors,
	FieldErrorList as ErrorList,
	FieldErrorItem as ErrorItem,
} from "./field.js";

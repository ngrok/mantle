/**
 * The parts of the `OtpInput` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Group,
	OtpInputSlotImpl as Slot,
	Separator,
} from "./otp-input.js";

/**
 * The parts of the `QrCode` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Frame,
	Pattern,
	Overlay,
} from "./qr-code.js";

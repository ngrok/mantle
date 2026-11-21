/**
 * The parts of the `WorldMap` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Graticule,
	Point,
	Tooltip,
	Legend,
	Connector,
	Callout,
} from "./world-map.js";

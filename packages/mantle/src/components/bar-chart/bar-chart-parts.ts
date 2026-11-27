/**
 * The parts of the `BarChart` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Bar,
	Grid,
	XAxis,
	YAxis,
	ReferenceLine,
	EmptySlot,
	Tooltip,
	Legend,
	CopyButton,
	List,
} from "./bar-chart.js";

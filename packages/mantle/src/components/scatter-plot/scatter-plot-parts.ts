/**
 * The parts of the `ScatterPlot` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Point,
	Grid,
	XAxis,
	YAxis,
	AxisTitle,
	ReferenceLine,
	Tooltip,
	Legend,
	CopyButton,
	List,
} from "./scatter-plot.js";

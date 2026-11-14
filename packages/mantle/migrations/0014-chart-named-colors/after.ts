// The TypeScript rule rewrites the chart tokens in class strings and custom
// properties outside JSX.
export const barClass = "bg-chart-blue hover:bg-chart-neutral";
export const gridClass = "divide-chart-emerald border-x-chart-pink ring-offset-chart-orange";
export const seriesStyle = { stroke: "var(--color-chart-teal)", fill: "var(--color-chart-amber)" };

// Negative cases: a bare token name, a later number, and a longer word stay.
export const legacyName = "chart-1";
export const other = "bg-chart-12 my-chart-1 text-chart-otherwise";

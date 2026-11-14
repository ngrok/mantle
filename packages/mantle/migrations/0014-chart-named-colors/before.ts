// The TypeScript rule rewrites the chart tokens in class strings and custom
// properties outside JSX.
export const barClass = "bg-chart-1 hover:bg-chart-other";
export const gridClass = "divide-chart-2 border-x-chart-3 ring-offset-chart-4";
export const seriesStyle = { stroke: "var(--color-chart-5)", fill: "var(--color-chart-8)" };

// Negative cases: a bare token name, a later number, and a longer word stay.
export const legacyName = "chart-1";
export const other = "bg-chart-12 my-chart-1 text-chart-otherwise";

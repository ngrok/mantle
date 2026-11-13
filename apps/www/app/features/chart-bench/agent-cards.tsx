import { Badge } from "@ngrok/mantle/badge";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { IconButton } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import type { CSSProperties } from "react";
import type { Config } from "./config";
import type { Row } from "./data";

/**
 * The dashboard prototype's hatch: a mask of 45° lines on a 5px tile, inked
 * below the In fill. It copies `agents-card-list.tsx` in the frontend repo.
 */
const HATCH_TILE = `<svg xmlns='http://www.w3.org/2000/svg' width='5' height='5'><path d='M0 5L5 0M-1 1L1 -1M4 6L6 4' stroke='black' stroke-width='1.25'/></svg>`;
const HATCH: CSSProperties = {
	backgroundColor: "oklch(from var(--color-neutral-300) calc(l - 0.18) c h)",
	maskImage: `url("data:image/svg+xml,${encodeURIComponent(HATCH_TILE)}")`,
	maskSize: "5px 5px",
};

/** The agent card's traffic chart in mantle: Out on the baseline, In (hatched) on top, with a tooltip. */
const MantleTraffic = ({
	rows,
	animate,
	label,
}: {
	rows: readonly Row[];
	animate: boolean;
	label: string;
}) => (
	<BarChart.Root
		data={rows}
		xKey="x"
		stacked
		animate={animate}
		aria-label={label}
		className="aspect-auto h-20 w-full"
	>
		<BarChart.Bar dataKey="b" label="Out" color="neutral" />
		<BarChart.Bar dataKey="a" label="In" color="neutral" texture="hatch" />
		<BarChart.Tooltip />
	</BarChart.Root>
);

/**
 * The agent card's traffic chart as the dashboard prototype draws it: one
 * `span` column per bucket, each its own Radix tooltip.
 */
const DomTraffic = ({ rows }: { rows: readonly Row[] }) => {
	const ceiling = Math.max(...rows.map((row) => row.a + row.b)) * 1.12;
	return (
		<div className="flex h-20 w-full items-end gap-0.5">
			{rows.map((row) => {
				const total = row.a + row.b;
				return (
					<Tooltip.Root key={String(row.x)}>
						<Tooltip.Trigger asChild>
							<span className="group/column relative flex h-full flex-1 flex-col justify-end">
								<span
									aria-hidden
									className="pointer-events-none absolute -inset-x-0.5 inset-y-0 rounded-sm bg-neutral-500/10 opacity-0 group-hover/column:opacity-100"
								/>
								<span
									className="relative flex flex-col gap-px overflow-hidden rounded-xs"
									style={{ height: `${(total / ceiling) * 100}%` }}
								>
									<span
										className="relative shrink-0 bg-neutral-300"
										style={{ height: `${(row.a / total) * 100}%` }}
									>
										<span aria-hidden className="absolute inset-0" style={HATCH} />
									</span>
									<span
										className="shrink-0 bg-neutral-500"
										style={{ height: `${(row.b / total) * 100}%` }}
									/>
								</span>
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<span className="block opacity-65">{String(row.x)}</span>
							<span className="block">In: {row.a.toFixed(1)} Gbits/s</span>
							<span className="block">Out: {row.b.toFixed(1)} Gbits/s</span>
						</Tooltip.Content>
					</Tooltip.Root>
				);
			})}
		</div>
	);
};

/**
 * One agent card in the layout of the dashboard's Agents page: a checkbox, the
 * name, badges, a meta line, the traffic chart, and an actions button.
 */
export const AgentCard = ({
	config,
	index,
	rows,
}: {
	config: Config;
	index: number;
	rows: readonly Row[];
}) => {
	const name = `agent-${index + 1}`;
	return (
		<Card.Root className="overflow-hidden rounded-xl" data-bench-chart>
			<Card.Body className="flex min-h-31 items-stretch gap-4 border-none p-0">
				<div className="flex min-w-0 flex-1 items-start">
					<label className="flex items-center py-5 pr-3 pl-5" htmlFor={`${name}-select`}>
						<Checkbox id={`${name}-select`} aria-label={`Select ${name}`} />
					</label>
					<div className="flex min-w-0 flex-col gap-2 py-4">
						<span className="text-strong font-medium">{name}</span>
						<div className="flex items-center gap-2 text-sm">
							<span>4.5.0</span>
							<Badge appearance="muted" color="neutral">
								US
							</Badge>
							<Badge appearance="muted" color="neutral">
								US-VA-1
							</Badge>
							<span>{(index % 6) + 1} endpoints</span>
						</div>
						<span className="text-muted truncate text-xs">
							Created 3w ago by Mark · Last seen 1m ago · Runs invoices at the month end
						</span>
					</div>
				</div>
				<div className="flex max-w-120 min-w-72 flex-1 items-stretch justify-end gap-4">
					<div className="flex min-w-0 flex-1 items-end py-4" data-bench-hover>
						{config.mode === "agents" ? (
							<MantleTraffic
								rows={rows}
								animate={config.animate}
								label={`Throughput for ${name}`}
							/>
						) : (
							<DomTraffic rows={rows} />
						)}
					</div>
					<div className="flex items-start p-4">
						<IconButton
							type="button"
							intent="neutral"
							appearance="ghost"
							size="sm"
							label={`Open actions for ${name}`}
							icon={<DotsThreeIcon weight="bold" />}
						/>
					</div>
				</div>
			</Card.Body>
		</Card.Root>
	);
};

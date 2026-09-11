import { AppLayout } from "@ngrok/mantle/app-layout";
import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import {
	DataTable,
	type Row,
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import { Input } from "@ngrok/mantle/input";
import { LiveRegion } from "@ngrok/mantle/live-region";
import { Main } from "@ngrok/mantle/main";
import { Select } from "@ngrok/mantle/select";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Table } from "@ngrok/mantle/table";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import {
	keepPreviousData,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

const SIMULATED_API_LATENCY_MS = 1_500;
const PAGE_SIZE = 8;
const DEMO_DOMAIN_COUNT = 1_284;
const DOMAINS_QUERY_KEY_ROOT = ["list-page-loading-domains"];

const regions = ["us", "eu", "ap", "au", "jp", "in", "sa"] as const;

/** An ngrok region code. */
type Region = (typeof regions)[number];

const certificateKinds = ["managed", "custom"] as const;

/** Who issues and renews the domain's TLS certificate. */
type CertificateKind = (typeof certificateKinds)[number];

const certificateLabels: Record<CertificateKind, string> = {
	managed: "Managed",
	custom: "Custom",
};

/** One reserved domain, as the demo API returns it. */
type Domain = {
	/** Stable identifier from the backend. */
	id: string;
	/** The fully qualified domain name. */
	name: string;
	/** The region the domain is reserved in. */
	region: Region;
	/** Who manages the certificate. */
	certificate: CertificateKind;
	/** How many endpoints are online on the domain right now. */
	endpointCount: number;
	/** ISO date string for when the domain was reserved. */
	createdAt: string;
};

/** The active list filters. `"any"` leaves that dimension unfiltered. */
type DomainFilters = {
	region: Region | "any";
	certificate: CertificateKind | "any";
	search: string;
};

const defaultFilters: DomainFilters = { region: "any", certificate: "any", search: "" };

/** One page of the list, plus the total the filters match. */
type DomainsPage = {
	items: Domain[];
	total: number;
};

/** Which response the demo API returns. */
type DomainsScenario = "success" | "no-domains" | "server-error";

const domainsScenarios = [
	"success",
	"no-domains",
	"server-error",
] as const satisfies ReadonlyArray<DomainsScenario>;

const scenarioLabels: Record<DomainsScenario, string> = {
	success: "Scenario: loaded",
	"no-domains": "Scenario: no domains",
	"server-error": "Scenario: request fails",
};

/** Narrows a raw select value to a known demo scenario. */
function isDomainsScenario(value: string): value is DomainsScenario {
	return domainsScenarios.some((scenario) => scenario === value);
}

/** Narrows a raw select value to a region filter. */
function isRegionFilter(value: string): value is DomainFilters["region"] {
	return value === "any" || regions.some((region) => region === value);
}

/** Narrows a raw select value to a certificate filter. */
function isCertificateFilter(value: string): value is DomainFilters["certificate"] {
	return value === "any" || certificateKinds.some((kind) => kind === value);
}

/** Whether any filter narrows the list, so an empty page reads as "no results" and not "no data". */
function hasActiveFilter(filters: DomainFilters): boolean {
	return filters.region !== "any" || filters.certificate !== "any" || filters.search.trim() !== "";
}

// The mock API below stands in for your API client. Keep the shape it returns
// (a page plus a total) and the `signal` it accepts; replace everything else.

const nameStems = [
	"api",
	"app",
	"shop",
	"auth",
	"billing",
	"docs",
	"webhooks",
	"staging",
	"preview",
	"admin",
] as const;
const nameSuffixes = ["ngrok.app", "ngrok.dev", "acme-labs.example", "example.com"] as const;
const NEWEST_CREATED_AT = Date.UTC(2026, 8, 11);
const DAY_MS = 86_400_000;

/** Reads `items[index]` with wraparound. Throws on an empty list, because a demo with no data to cycle through is a bug. */
function cycle<T>(items: ReadonlyArray<T>, index: number): T {
	const item = items[index % items.length];
	if (item == null) {
		throw new Error("cycle() needs a non-empty list");
	}
	return item;
}

/** Builds the fixed dataset once. Every field derives from the index, so the list is the same on every load. */
function createDemoDomains(): Domain[] {
	return Array.from({ length: DEMO_DOMAIN_COUNT }, (_, index) => {
		const stem = cycle(nameStems, index);
		const suffix = cycle(nameSuffixes, Math.floor(index / nameStems.length));
		return {
			id: `rd_${(index + 1).toString().padStart(4, "0")}`,
			name: `${stem}-${index + 1}.${suffix}`,
			region: cycle(regions, index * 3),
			certificate: index % 5 === 0 ? "custom" : "managed",
			endpointCount: (index * 7) % 4,
			createdAt: new Date(NEWEST_CREATED_AT - index * DAY_MS).toISOString(),
		};
	});
}

const demoDomains = createDemoDomains();

/** Whether a domain passes every active filter. */
function matchesFilters(domain: Domain, filters: DomainFilters): boolean {
	if (filters.region !== "any" && domain.region !== filters.region) {
		return false;
	}
	if (filters.certificate !== "any" && domain.certificate !== filters.certificate) {
		return false;
	}
	const search = filters.search.trim().toLowerCase();
	return search === "" || domain.name.includes(search);
}

/** Waits for the simulated network, and rejects when TanStack Query aborts the request. */
function waitForDemoApi(signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("The domains request was aborted.", "AbortError"));
			return;
		}

		const timeoutId = setTimeout(() => {
			signal?.removeEventListener("abort", handleAbort);
			resolve();
		}, SIMULATED_API_LATENCY_MS);

		/** Cancels the simulated delay when the query unmounts or its key changes. */
		function handleAbort() {
			clearTimeout(timeoutId);
			reject(new DOMException("The domains request was aborted.", "AbortError"));
		}

		signal?.addEventListener("abort", handleAbort, { once: true });
	});
}

/** Options accepted by the simulated domains fetcher. */
type FetchDomainsOptions = {
	/** The filters to apply server-side. */
	filters: DomainFilters;
	/** Which response to simulate. */
	scenario: DomainsScenario;
	/** Abort signal passed by TanStack Query. */
	signal?: AbortSignal;
};

/** Simulates a paged list endpoint: latency, server-side filters, a total, and a failure mode. */
async function fetchDomains({
	filters,
	scenario,
	signal,
}: FetchDomainsOptions): Promise<DomainsPage> {
	await waitForDemoApi(signal);

	if (scenario === "server-error") {
		throw new Error("The domains service returned 503 Service Unavailable.");
	}

	if (scenario === "no-domains") {
		return { items: [], total: 0 };
	}

	const matches = demoDomains.filter((domain) => matchesFilters(domain, filters));
	return { items: matches.slice(0, PAGE_SIZE), total: matches.length };
}

/** Options for the domains list query. */
type UseDomainsQueryOptions = {
	/** The filters the server applies. Each distinct set is its own cache entry. */
	filters: DomainFilters;
	/** Demo scenario selected in the toolbar. */
	scenario: DomainsScenario;
};

/** Owns fetching, caching, and the previous-page policy for the domains list. */
function useDomainsQuery({
	filters,
	scenario,
}: UseDomainsQueryOptions): UseQueryResult<DomainsPage, Error> {
	return useQuery({
		queryKey: [...DOMAINS_QUERY_KEY_ROOT, scenario, filters],
		queryFn: ({ signal }) => fetchDomains({ filters, scenario, signal }),
		// Why keepPreviousData: a filter change swaps the query key. Without it
		// the table falls back to skeleton rows on every keystroke. With it the
		// loaded rows stay on screen, dimmed, until the next page lands.
		placeholderData: keepPreviousData,
		// Why no retry: the demo's failure is deterministic, so a retry only adds
		// latency. A real list encodes its retry policy here, as the
		// overlay-async recipe does.
		retry: false,
		// Why staleTime: a return visit within 30 seconds renders from the cache,
		// so the reader never sees the skeleton twice.
		staleTime: 30_000,
	});
}

/** The one region of the table body that renders. */
type ListBodyState =
	| { kind: "pending" }
	| { kind: "error"; error: Error }
	| { kind: "no-data" }
	| { kind: "no-results" }
	| { kind: "rows"; items: Domain[]; total: number };

/** Options for deriving the table body state. */
type ResolveListBodyStateOptions = {
	/** The domains list query. */
	query: UseQueryResult<DomainsPage, Error>;
	/** Whether a filter narrows the list. */
	isFiltered: boolean;
};

/**
 * Derives the table body state from the query. Pending wins over empty, so
 * "no results" never flashes before the first response lands.
 */
function resolveListBodyState({ query, isFiltered }: ResolveListBodyStateOptions): ListBodyState {
	switch (query.status) {
		case "pending": {
			return { kind: "pending" };
		}
		case "error": {
			return { kind: "error", error: query.error };
		}
		case "success": {
			const { items, total } = query.data;
			if (items.length > 0) {
				return { kind: "rows", items, total };
			}
			return { kind: isFiltered ? "no-results" : "no-data" };
		}
	}
}

const numberFormat = new Intl.NumberFormat("en-US");

/** Options for the count line. */
type FormatDomainCountOptions = {
	/** How many rows the page shows. */
	shown: number;
	/** How many domains match the filters. */
	total: number;
};

/** Formats the count line: `Showing 8 of 1,284 domains`. */
function formatDomainCount({ shown, total }: FormatDomainCountOptions): string {
	return `Showing ${numberFormat.format(shown)} of ${numberFormat.format(total)} domains`;
}

/** Options for the live-region message. */
type DescribeListStateOptions = {
	/** The table body state. */
	state: ListBodyState;
	/** Whether a refetch is in flight behind loaded rows. */
	isRefetching: boolean;
};

/**
 * The live-region message for a list state. The skeleton rows are
 * `aria-hidden`, so this message is the only loading signal a screen reader
 * gets.
 */
function describeListState({ state, isRefetching }: DescribeListStateOptions): string {
	if (isRefetching) {
		return "Updating domains";
	}
	switch (state.kind) {
		case "pending": {
			return "Loading domains";
		}
		case "error": {
			return "Domains failed to load";
		}
		case "no-data": {
			return "No domains yet";
		}
		case "no-results": {
			return "No domains match the filters";
		}
		case "rows": {
			return formatDomainCount({ shown: state.items.length, total: state.total });
		}
	}
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

// The list is sorted and filtered on the server, so the table registers no
// client-side features.
const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Domain>();

// Every column but the first names its width. With `table-fixed` on the
// table, those widths hold from the skeleton rows through the loaded rows, and
// the first column absorbs whatever is left.
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Domain</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell className="text-strong truncate">{props.getValue()}</DataTable.Cell>
		),
	}),
	columnHelper.accessor("region", {
		id: "region",
		header: () => <DataTable.Header className="w-24">Region</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("certificate", {
		id: "certificate",
		header: () => <DataTable.Header className="w-36">Certificate</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<Badge appearance="muted" color={props.getValue() === "managed" ? "success" : "neutral"}>
					{certificateLabels[props.getValue()]}
				</Badge>
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("endpointCount", {
		id: "endpointCount",
		header: () => <DataTable.Header className="w-28 text-right">Endpoints</DataTable.Header>,
		cell: (props) => <DataTable.Cell className="text-right">{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("createdAt", {
		id: "createdAt",
		header: () => <DataTable.Header className="w-36">Created</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>{dateFormat.format(new Date(props.getValue()))}</DataTable.Cell>
		),
	}),
]);

/**
 * The skeleton bar for each column id, sized to the content it stands in for.
 * A bar near the real content's width keeps the row height and the column
 * widths still when the rows swap in.
 */
const skeletonCellClassNames: Record<string, string> = {
	name: "w-3/4",
	region: "w-6",
	certificate: "h-5 w-20 rounded-full",
	endpointCount: "ml-auto w-6",
	createdAt: "w-28",
};

/** Why a module constant: `useTable` compares `data` by reference, so a fresh `[]` per render would reset the row model. */
const noDomains: Domain[] = [];

/** Props for the skeleton rows. */
type SkeletonRowsProps = {
	/** The table's leaf columns, so the skeleton has one cell per real column. */
	columns: ReadonlyArray<{ id: string }>;
	/** How many rows to render. Match it to the page size. */
	count: number;
};

/**
 * Placeholder rows with one skeleton per column. They use the same cell part
 * as the loaded rows, so padding and row height match, and they derive from
 * the same column list, so the column count cannot drift.
 */
function SkeletonRows({ columns, count }: SkeletonRowsProps) {
	return Array.from({ length: count }, (_, index) => (
		// Why aria-hidden: the rows carry no information. The page's LiveRegion
		// announces the loading state instead.
		<Table.Row key={index} aria-hidden>
			{columns.map((column) => (
				<DataTable.Cell key={column.id}>
					<Skeleton className={cx("h-4", skeletonCellClassNames[column.id] ?? "w-24")} />
				</DataTable.Cell>
			))}
		</Table.Row>
	));
}

/** Props for the table body. */
type DomainsTableBodyProps = {
	/** The derived body state. */
	state: ListBodyState;
	/** The rows TanStack Table built from the loaded page. */
	rows: ReadonlyArray<Row<typeof features, Domain>>;
	/** The table's leaf columns, for the skeleton rows. */
	columns: ReadonlyArray<{ id: string }>;
	/** Whether the retry request is in flight. */
	isRetrying: boolean;
	/** Refetches the current page after an error. */
	onRetry: () => void;
	/** Resets every filter to its default. */
	onClearFilters: () => void;
};

/** Renders exactly one of the five body states inside the table frame. */
function DomainsTableBody({
	state,
	rows,
	columns,
	isRetrying,
	onRetry,
	onClearFilters,
}: DomainsTableBodyProps) {
	switch (state.kind) {
		case "pending": {
			return <SkeletonRows columns={columns} count={PAGE_SIZE} />;
		}
		case "rows": {
			return rows.map((row) => <DataTable.Row key={row.id} row={row} />);
		}
		case "error": {
			return (
				<DataTable.EmptyRow>
					<Empty.Root>
						<Empty.Icon svg={<WarningCircleIcon />} />
						<Empty.Title>Domains failed to load</Empty.Title>
						<Empty.Description>
							<p>{state.error.message}</p>
						</Empty.Description>
						<Empty.Actions>
							<Button
								type="button"
								appearance="outlined"
								intent="neutral"
								isLoading={isRetrying}
								onClick={onRetry}
							>
								Retry
							</Button>
						</Empty.Actions>
					</Empty.Root>
				</DataTable.EmptyRow>
			);
		}
		case "no-results": {
			return (
				<DataTable.EmptyRow>
					<Empty.Root>
						<Empty.Icon svg={<MagnifyingGlassIcon />} />
						<Empty.Title>No domains match the filters</Empty.Title>
						<Empty.Description>
							<p>Try a different search, or clear the filters to see every domain.</p>
						</Empty.Description>
						<Empty.Actions>
							<Button type="button" appearance="outlined" intent="neutral" onClick={onClearFilters}>
								Clear filters
							</Button>
						</Empty.Actions>
					</Empty.Root>
				</DataTable.EmptyRow>
			);
		}
		case "no-data": {
			return (
				<DataTable.EmptyRow>
					<Empty.Root>
						<Empty.Icon svg={<GlobeHemisphereWestIcon />} />
						<Empty.Title>No domains yet</Empty.Title>
						<Empty.Description>
							<p>Reserve a domain to route public traffic to an endpoint.</p>
						</Empty.Description>
						<Empty.Actions>
							<Button type="button" appearance="outlined" intent="neutral">
								New domain
							</Button>
						</Empty.Actions>
					</Empty.Root>
				</DataTable.EmptyRow>
			);
		}
	}
}

/** Props for the count line. */
type DomainCountProps = {
	/** The derived body state. */
	state: ListBodyState;
};

/** The text of the count line, or a skeleton while the first page loads. */
function DomainCountText({ state }: DomainCountProps) {
	switch (state.kind) {
		case "pending": {
			// Why asChild: a `<div>` inside a `<p>` splits the paragraph in the
			// server-rendered HTML, and the table below moves on hydration.
			return (
				<Skeleton asChild className="h-3 w-44">
					<span />
				</Skeleton>
			);
		}
		case "error": {
			return null;
		}
		case "no-data":
		case "no-results": {
			return formatDomainCount({ shown: 0, total: 0 });
		}
		case "rows": {
			return formatDomainCount({ shown: state.items.length, total: state.total });
		}
	}
}

/**
 * The count line above the table. It is mounted in every state at a fixed
 * height and aligned to the right edge, so the table never moves when the
 * count arrives and a wider number moves nothing beside it. It never reads
 * `0` while the first page is still loading.
 */
function DomainCount({ state }: DomainCountProps) {
	return (
		<p className="text-muted flex h-5 items-center justify-end text-sm">
			<DomainCountText state={state} />
		</p>
	);
}

/** Props for the domains table. */
type DomainsTableProps = {
	/** The domains list query. */
	query: UseQueryResult<DomainsPage, Error>;
	/** Whether a filter narrows the list. */
	isFiltered: boolean;
	/** Resets every filter to its default. */
	onClearFilters: () => void;
};

/** The table frame: the header renders from the column list on the first frame, and only the body branches. */
function DomainsTable({ query, isFiltered, onClearFilters }: DomainsTableProps) {
	const table = useTable({ features, data: query.data?.items ?? noDomains, columns });
	const state = resolveListBodyState({ query, isFiltered });
	const isRefetching = query.isFetching && !query.isPending;

	return (
		<div className="flex flex-col gap-2">
			<DomainCount state={state} />
			{/* Why aria-busy: a refetch behind loaded rows dims the table instead of
			    replacing it, and the attribute tells assistive tech the region is
			    updating. */}
			<div aria-busy={isRefetching} className="transition-opacity aria-busy:opacity-60">
				<DataTable.Root table={table} className="[&_table]:table-fixed">
					<DataTable.Head />
					<DataTable.Body>
						<DomainsTableBody
							state={state}
							rows={table.getRowModel().rows}
							columns={table.getAllLeafColumns()}
							isRetrying={query.isFetching}
							onRetry={() => {
								void query.refetch();
							}}
							onClearFilters={onClearFilters}
						/>
					</DataTable.Body>
				</DataTable.Root>
			</div>
		</div>
	);
}

/** Props for a filter select. */
type FilterSelectProps = {
	/** The dimension the select filters, used as the accessible name and the option prefix. */
	label: string;
	/** The selected option value. */
	value: string;
	/** The options, including the `"any"` option first. */
	options: ReadonlyArray<{ value: string; label: string }>;
	/** Called with the raw option value; the caller narrows it. */
	onValueChange: (value: string) => void;
};

/** A fixed-width filter, so a label change (`Region: any` to `Region: eu`) moves no sibling. */
function FilterSelect({ label, value, options, onValueChange }: FilterSelectProps) {
	const selected = options.find((option) => option.value === value);

	return (
		<Select.Root value={value} onValueChange={onValueChange}>
			<Select.Trigger className="w-44" aria-label={label}>
				{/* Why children: Radix fills an empty `Select.Value` from the mounted
				    items, which the server never renders. Explicit text puts the
				    label in the server HTML, so the trigger is not blank on the
				    first frame. */}
				<Select.Value>
					{label}: {selected?.label}
				</Select.Value>
			</Select.Trigger>
			<Select.Content width="trigger">
				{options.map((option) => (
					<Select.Item key={option.value} value={option.value}>
						{label}: {option.label}
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);
}

const regionOptions = [
	{ value: "any", label: "any" },
	...regions.map((region) => ({ value: region, label: region })),
];

const certificateOptions = [
	{ value: "any", label: "any" },
	...certificateKinds.map((kind) => ({ value: kind, label: certificateLabels[kind] })),
];

/** Props for the list page. */
type DomainsListPageProps = {
	/** Demo scenario selected in the toolbar. */
	scenario: DomainsScenario;
};

/**
 * The recipe. The heading, description, primary action, filters, and column
 * headers render on the first frame. Only the count line and the table body
 * read the query.
 */
export function DomainsListPage({ scenario }: DomainsListPageProps) {
	const [filters, setFilters] = useState(defaultFilters);
	// Why useDeferredValue: the search box updates on every keystroke, and the
	// query key follows one frame behind, so typing never waits on a render of
	// the table.
	const deferredSearch = useDeferredValue(filters.search);
	const query = useDomainsQuery({ filters: { ...filters, search: deferredSearch }, scenario });
	const state = resolveListBodyState({ query, isFiltered: hasActiveFilter(filters) });

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
			<LiveRegion>
				{describeListState({ state, isRefetching: query.isFetching && !query.isPending })}
			</LiveRegion>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-strong text-2xl font-medium">Domains</h1>
					<p className="text-muted text-sm">
						Reserved domains route public traffic to your endpoints. Reserve one per region you
						serve from.
					</p>
				</div>
				<Button type="button" appearance="filled" intent="accent">
					New domain
				</Button>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<FilterSelect
					label="Region"
					value={filters.region}
					options={regionOptions}
					onValueChange={(value) => {
						if (isRegionFilter(value)) {
							setFilters((current) => ({ ...current, region: value }));
						}
					}}
				/>
				<FilterSelect
					label="Certificate"
					value={filters.certificate}
					options={certificateOptions}
					onValueChange={(value) => {
						if (isCertificateFilter(value)) {
							setFilters((current) => ({ ...current, certificate: value }));
						}
					}}
				/>
				<Input
					type="search"
					aria-label="Search domains"
					placeholder="Search domains…"
					className="min-w-64 flex-1"
					value={filters.search}
					onChange={(event) => {
						const search = event.target.value;
						setFilters((current) => ({ ...current, search }));
					}}
				/>
			</div>
			<DomainsTable
				query={query}
				isFiltered={hasActiveFilter(filters)}
				onClearFilters={() => {
					setFilters(defaultFilters);
				}}
			/>
		</div>
	);
}

/**
 * The framed preview: the domains list page inside an app shell, with
 * demo-only controls in the toolbar to pick the response and replay the
 * cold load. Renders as an entire framed-preview document (see
 * preview-registry.ts), so it pins itself with `fixed inset-0` and owns the
 * `Main` landmark.
 */
export function ListPageLoadingDemo() {
	const [scenario, setScenario] = useState<DomainsScenario>("success");
	const queryClient = useQueryClient();

	/** Demo-only: resets every cached page, so the next render shows the cold load again. */
	const replay = () => {
		void queryClient.resetQueries({ queryKey: DOMAINS_QUERY_KEY_ROOT });
	};

	return (
		<AppLayout.Root className="fixed inset-0">
			<SkipToMainLink />
			<AppLayout.Workspace>
				<AppLayout.Content>
					<AppLayout.Header>
						<p className="text-strong text-sm font-medium">Domains</p>
						<div className="ml-auto flex items-center gap-2">
							<Select.Root
								value={scenario}
								onValueChange={(value) => {
									if (isDomainsScenario(value)) {
										setScenario(value);
									}
								}}
							>
								<Select.Trigger className="w-52" aria-label="Demo scenario">
									<Select.Value>{scenarioLabels[scenario]}</Select.Value>
								</Select.Trigger>
								<Select.Content width="trigger">
									{domainsScenarios.map((value) => (
										<Select.Item key={value} value={value}>
											{scenarioLabels[value]}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
							<Button
								type="button"
								appearance="outlined"
								intent="neutral"
								size="sm"
								onClick={replay}
							>
								Replay load
							</Button>
						</div>
					</AppLayout.Header>
					<AppLayout.Body asChild>
						<Main>
							<DomainsListPage scenario={scenario} />
						</Main>
					</AppLayout.Body>
				</AppLayout.Content>
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

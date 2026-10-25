import { AppLayout } from "@ngrok/mantle/app-layout";
import { Avatar } from "@ngrok/mantle/avatar";
import { Badge } from "@ngrok/mantle/badge";
import { BarChart } from "@ngrok/mantle/bar-chart";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";

const REQUEST_DAYS = 30;
const DEPLOY_WEEKS = 12;
const DAY_MS = 86_400_000;

/** The demo's clock. Every date derives from it, so the list is the same on every load. */
const TODAY = new Date(2026, 9, 8);

/** Local midnight `days` before the demo's clock, built from date parts so a DST change never adds a time of day. */
function daysBefore(days: number): Date {
	return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - days);
}

const serviceKinds = ["container", "function", "static"] as const;

/** How a service runs. */
type ServiceKind = (typeof serviceKinds)[number];

const kindLabels: Record<ServiceKind, string> = {
	container: "Container",
	function: "Function",
	static: "Static",
};

/** The exclusive upper bound on a running service's weekly deploy count, by kind. */
const deployCadences: Record<ServiceKind, number> = {
	container: 9,
	function: 6,
	static: 3,
};

const serviceStatuses = ["online", "degraded", "paused"] as const;

/** Whether a service serves traffic right now. */
type ServiceStatus = (typeof serviceStatuses)[number];

const statusLabels: Record<ServiceStatus, string> = {
	online: "Online",
	degraded: "Degraded",
	paused: "Paused",
};

/** The badge color per status, so a status change never reads as a color change alone. */
const statusColors = {
	online: "success",
	degraded: "warning",
	paused: "neutral",
} as const satisfies Record<ServiceStatus, string>;

/** One day of traffic: the x value and the count the bar reads. */
type DailyRequests = {
	day: Date;
	count: number;
};

/** One week of deploys: the first day of the week and the count the bar reads. */
type WeeklyDeploys = {
	week: Date;
	count: number;
};

/** A member who owns a service. */
type Owner = {
	/** Stable identifier, and the seed for the avatar swatch. */
	id: string;
	name: string;
};

/** One service, as the demo API returns it. */
type Service = {
	id: string;
	name: string;
	kind: ServiceKind;
	status: ServiceStatus;
	/** The last 30 days of request counts, oldest first. */
	requests: ReadonlyArray<DailyRequests>;
	/** The sum of `requests`, computed once when the data lands. */
	requestTotal: number;
	/** The last 12 weeks of deploy counts, oldest first. */
	deploys: ReadonlyArray<WeeklyDeploys>;
	/** The sum of `deploys`, computed once when the data lands. */
	deployTotal: number;
	owners: ReadonlyArray<Owner>;
	createdAt: Date;
};

// The seeded data below stands in for your API. Keep the row shape (a series
// per sparkline, its total, and a stable array identity) and replace the rest.

/** The shape of a service's traffic over the last 30 days. */
type TrafficShape = "steady" | "steady-high" | "spiky" | "flat-low" | "zero" | "new";

/** What the generator needs to build one service: the fixed facts, and the shape it draws. */
type ServiceSeed = {
	name: string;
	kind: ServiceKind;
	status: ServiceStatus;
	shape: TrafficShape;
	/** How many days before the demo's clock the service was created. */
	ageDays: number;
};

const serviceSeeds: ReadonlyArray<ServiceSeed> = [
	{ name: "edge-router", kind: "container", status: "online", shape: "steady-high", ageDays: 412 },
	{ name: "billing-worker", kind: "function", status: "online", shape: "steady", ageDays: 388 },
	{ name: "docs-site", kind: "static", status: "online", shape: "steady", ageDays: 301 },
	{ name: "webhook-relay", kind: "function", status: "degraded", shape: "spiky", ageDays: 266 },
	{ name: "auth-gateway", kind: "container", status: "online", shape: "steady-high", ageDays: 240 },
	{ name: "image-resizer", kind: "function", status: "online", shape: "steady", ageDays: 198 },
	{ name: "notifications", kind: "container", status: "degraded", shape: "steady", ageDays: 171 },
	{ name: "search-indexer", kind: "container", status: "online", shape: "spiky", ageDays: 150 },
	{ name: "pdf-export", kind: "function", status: "paused", shape: "zero", ageDays: 133 },
	{ name: "audit-log", kind: "container", status: "online", shape: "steady", ageDays: 120 },
	{ name: "rate-limiter", kind: "container", status: "online", shape: "steady-high", ageDays: 97 },
	{ name: "status-page", kind: "static", status: "online", shape: "flat-low", ageDays: 90 },
	{ name: "feature-flags", kind: "container", status: "online", shape: "steady", ageDays: 76 },
	{ name: "email-renderer", kind: "function", status: "online", shape: "flat-low", ageDays: 64 },
	{ name: "geo-lookup", kind: "function", status: "online", shape: "steady", ageDays: 58 },
	{ name: "changelog", kind: "static", status: "online", shape: "flat-low", ageDays: 45 },
	{ name: "metrics-rollup", kind: "container", status: "online", shape: "steady", ageDays: 41 },
	{ name: "legacy-api", kind: "container", status: "paused", shape: "zero", ageDays: 33 },
	{ name: "session-store", kind: "container", status: "online", shape: "steady-high", ageDays: 29 },
	{ name: "cron-scheduler", kind: "function", status: "online", shape: "spiky", ageDays: 22 },
	{ name: "thumbnailer", kind: "function", status: "degraded", shape: "steady", ageDays: 19 },
	{ name: "ml-scoring", kind: "container", status: "online", shape: "new", ageDays: 14 },
	{ name: "marketing-site", kind: "static", status: "online", shape: "steady", ageDays: 9 },
	{ name: "sandbox-env", kind: "container", status: "online", shape: "spiky", ageDays: 3 },
];

const ownerPool: ReadonlyArray<Owner> = [
	{ id: "usr_01", name: "Ada Okafor" },
	{ id: "usr_02", name: "Mateo Lindqvist" },
	{ id: "usr_03", name: "Priya Raman" },
	{ id: "usr_04", name: "Jonas Weber" },
	{ id: "usr_05", name: "Sofia Almeida" },
	{ id: "usr_06", name: "Kenji Mori" },
	{ id: "usr_07", name: "Leila Haddad" },
	{ id: "usr_08", name: "Tomás Ferreira" },
];

/**
 * A seeded generator of numbers in `[0, 1)` (mulberry32). The same seed
 * yields the same sequence on the server and in every browser, so the bars
 * never change between loads and never mismatch on hydration.
 */
function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = Math.imul(state ^ (state >>> 15), state | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/** Reads `items[index]` with wraparound. Throws on an empty list, because a demo with no data to cycle through is a bug. */
function cycle<T>(items: ReadonlyArray<T>, index: number): T {
	const item = items[index % items.length];
	if (item == null) {
		throw new Error("cycle() needs a non-empty list");
	}
	return item;
}

/** One day's request count for a traffic shape. Weekends dip, and a new service has no traffic before its first deploy. */
function dailyCount({
	shape,
	day,
	daysAgo,
	random,
}: {
	shape: TrafficShape;
	day: Date;
	daysAgo: number;
	random: () => number;
}): number {
	const weekend = day.getDay() === 0 || day.getDay() === 6 ? 0.55 : 1;
	switch (shape) {
		case "zero": {
			return 0;
		}
		case "flat-low": {
			return Math.round(4 + random() * 28);
		}
		case "steady": {
			return Math.round((4_000 + random() * 2_500) * weekend);
		}
		case "steady-high": {
			return Math.round((60_000 + random() * 9_000) * weekend);
		}
		case "spiky": {
			const base = 600 + random() * 500;
			return Math.round(random() < 0.2 ? base * (6 + random() * 12) : base);
		}
		case "new": {
			if (daysAgo >= 14) {
				return 0;
			}
			return Math.round((14 - daysAgo) * 320 * (0.8 + random() * 0.4));
		}
	}
}

/** One week's deploy count: cadence follows the kind, and a paused or brand-new service has gaps. */
function weeklyCount(seed: ServiceSeed, weeksAgo: number, random: () => number): number {
	if (seed.shape === "new") {
		return weeksAgo >= 2 ? 0 : 3 + Math.floor(random() * 6);
	}
	if (seed.status === "paused") {
		return weeksAgo >= 6 ? Math.floor(random() * 3) : 0;
	}
	return Math.floor(random() * deployCadences[seed.kind]);
}

/** Builds one service from its seed. The series arrays are built once here and never rebuilt, so each chart keeps one `data` identity. */
function createService(seed: ServiceSeed, index: number): Service {
	const random = createRandom(index + 1);
	const requests = Array.from({ length: REQUEST_DAYS }, (_, position) => {
		const daysAgo = REQUEST_DAYS - 1 - position;
		const day = daysBefore(daysAgo);
		return { day, count: dailyCount({ shape: seed.shape, day, daysAgo, random }) };
	});
	const deploys = Array.from({ length: DEPLOY_WEEKS }, (_, position) => {
		const weeksAgo = DEPLOY_WEEKS - 1 - position;
		return { week: daysBefore(weeksAgo * 7 + 6), count: weeklyCount(seed, weeksAgo, random) };
	});
	const ownerCount = 1 + Math.floor(random() * 3);
	const firstOwner = Math.floor(random() * ownerPool.length);
	return {
		id: `svc_${(index + 1).toString().padStart(3, "0")}`,
		name: seed.name,
		kind: seed.kind,
		status: seed.status,
		requests,
		requestTotal: requests.reduce((sum, point) => sum + point.count, 0),
		deploys,
		deployTotal: deploys.reduce((sum, point) => sum + point.count, 0),
		owners: Array.from({ length: ownerCount }, (_, offset) =>
			cycle(ownerPool, firstOwner + offset),
		),
		createdAt: daysBefore(seed.ageDays),
	};
}

/** Why a module constant: `useTable` and every `BarChart.Root` compare `data` by reference, so the rows and their series are built once. */
const services: ReadonlyArray<Service> = serviceSeeds.map(createService);

/** `167K`, `1.9M`, `0`: the magnitude a reader compares down the column. */
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact" });

/** `2026-09-24`, from local date parts, so the server and the client agree whatever their time zones. */
function formatIsoDate(date: Date): string {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** The age of a date as `today`, `3d ago`, `2w ago`, `1mo ago`, or `1y ago`. Rounds the day count, so a DST hour never loses a day. */
function formatRelativeAge(date: Date, now: Date): string {
	const days = Math.round((now.getTime() - date.getTime()) / DAY_MS);
	if (days < 1) {
		return "today";
	}
	if (days < 7) {
		return `${days}d ago`;
	}
	if (days < 30) {
		return `${Math.floor(days / 7)}w ago`;
	}
	if (days < 365) {
		return `${Math.floor(days / 30)}mo ago`;
	}
	return `${Math.floor(days / 365)}y ago`;
}

// The list is static, so the table registers no client-side features.
const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Service>();

// Every column but the first names its width. With `table-fixed` on the
// table, a sparkline column stays the same width down the whole list, and the
// name column absorbs whatever is left.
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => (
			// Why translate="no": a service name is copied into a CLI and a config
			// file, and a translated one names the wrong service.
			<DataTable.Cell className="text-strong truncate font-mono text-xs" translate="no">
				{props.getValue()}
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("kind", {
		id: "kind",
		header: () => <DataTable.Header className="w-28">Kind</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<Badge appearance="muted" color="neutral">
					{kindLabels[props.getValue()]}
				</Badge>
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: () => <DataTable.Header className="w-28">Status</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<Badge appearance="muted" color={statusColors[props.getValue()]}>
					{statusLabels[props.getValue()]}
				</Badge>
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("requests", {
		id: "requests",
		header: () => <DataTable.Header className="w-44">Requests (30d)</DataTable.Header>,
		cell: (props) => {
			const service = props.row.original;
			return (
				<DataTable.Cell>
					<div className="flex items-center gap-2">
						<BarChart.Root
							data={service.requests}
							xKey="day"
							mode="static"
							aria-label={`Requests for ${service.name}, last 30 days`}
							className="aspect-auto h-6 w-28"
						>
							<BarChart.Bar dataKey="count" label="Requests" />
						</BarChart.Root>
						<span className="text-muted min-w-10 text-right text-xs tabular-nums">
							{compactNumber.format(service.requestTotal)}
						</span>
					</div>
				</DataTable.Cell>
			);
		},
	}),
	columnHelper.accessor("deploys", {
		id: "deploys",
		header: () => <DataTable.Header className="w-44">Deploys (12w)</DataTable.Header>,
		cell: (props) => {
			const service = props.row.original;
			return (
				<DataTable.Cell>
					<div className="flex items-center gap-2">
						<BarChart.Root
							data={service.deploys}
							xKey="week"
							mode="static"
							aria-label={`Deploys for ${service.name}, last 12 weeks`}
							className="aspect-auto h-6 w-28"
						>
							<BarChart.Bar dataKey="count" label="Deploys" />
						</BarChart.Root>
						<span className="text-muted min-w-10 text-right text-xs tabular-nums">
							{compactNumber.format(service.deployTotal)}
						</span>
					</div>
				</DataTable.Cell>
			);
		},
	}),
	columnHelper.accessor("owners", {
		id: "owners",
		header: () => <DataTable.Header className="w-24">Owners</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<div className="flex -space-x-1.5">
					{props.getValue().map((owner) => (
						// Why role="img" and aria-label: the initials are aria-hidden, and in
						// a bare stack nothing else names the member.
						<Avatar.Root
							key={owner.id}
							role="img"
							aria-label={owner.name}
							colorSeed={owner.id}
							className="size-6 ring-2 ring-(--background-color-card)"
						>
							<Avatar.Fallback name={owner.name} />
						</Avatar.Root>
					))}
				</div>
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("createdAt", {
		id: "createdAt",
		header: () => <DataTable.Header className="w-24">Created</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<time dateTime={formatIsoDate(props.getValue())}>
					{formatRelativeAge(props.getValue(), TODAY)}
				</time>
			</DataTable.Cell>
		),
	}),
]);

/**
 * The recipe: a services list with two static sparklines per row. Each
 * `BarChart.Root` mounts dormant, paints once it nears the viewport, and
 * carries a name that tells it apart from the other 47.
 */
export function ServicesListPage() {
	const table = useTable({ features, data: services, columns });

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-strong text-2xl font-medium">Services</h1>
				<p className="text-muted text-sm">
					Every service in this workspace, with a month of traffic and a quarter of deploys beside
					each one.
				</p>
			</div>
			<DataTable.Root table={table} className="[&_table]:table-fixed">
				<DataTable.Head />
				<DataTable.Body>
					{table.getRowModel().rows.map((row) => (
						<DataTable.Row key={row.id} row={row} />
					))}
				</DataTable.Body>
			</DataTable.Root>
		</div>
	);
}

/**
 * The framed preview: the services list inside an app shell. Renders as an
 * entire framed-preview document (see preview-registry.ts), so it pins itself
 * with `fixed inset-0` and owns the `Main` landmark.
 */
export function SparklinesInAListDemo() {
	return (
		<AppLayout.Root className="fixed inset-0">
			<SkipToMainLink />
			<AppLayout.Workspace>
				<AppLayout.Content>
					<AppLayout.Header>
						<p className="text-strong text-sm font-medium">Services</p>
					</AppLayout.Header>
					<AppLayout.Body>
						<ServicesListPage />
					</AppLayout.Body>
				</AppLayout.Content>
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

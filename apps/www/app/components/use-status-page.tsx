import { useQuery } from "@tanstack/react-query";

const statusIndicatorLevels = ["none", "minor", "major", "critical"] as const;

type StatusIndicatorLevel = (typeof statusIndicatorLevels)[number];

type StatusIndicator = {
	/** The severity level of the current status */
	indicator: StatusIndicatorLevel;
	/** Human-readable description of the status */
	description: string;
	/** Tailwind text color class */
	color: string;
	/** Tailwind background color class */
	bgColor: string;
	/** Tailwind hover text color class */
	hoverColor: string;
	/** Whether to show the pulsing animation */
	animatePulse?: boolean;
};

const STATUS_CONFIGS: Record<StatusIndicatorLevel, Omit<StatusIndicator, "indicator">> = {
	none: {
		animatePulse: true,
		bgColor: "bg-emerald-600",
		color: "text-emerald-600",
		description: "All systems operational",
		hoverColor: "hover:text-emerald-700",
	},
	minor: {
		bgColor: "bg-yellow-600",
		color: "text-yellow-600",
		description: "Minor service issues",
		hoverColor: "hover:text-yellow-700",
	},
	major: {
		bgColor: "bg-orange-600",
		color: "text-orange-600",
		description: "Major service disruption",
		hoverColor: "hover:text-orange-700",
	},
	critical: {
		bgColor: "bg-danger-600",
		color: "text-danger-600",
		description: "Service outage",
		hoverColor: "hover:text-danger-700",
	},
};

function getConfigForStatusIndicatorLevel(level: StatusIndicatorLevel) {
	return STATUS_CONFIGS[level];
}

function isStatusIndicatorLevel(value: unknown): value is StatusIndicatorLevel {
	return statusIndicatorLevels.some((level) => level === value);
}

/**
 * The indicator level of the ngrok status page. It throws for a response that
 * has no known level.
 *
 * @see https://developer.statuspage.io/#operation/getPagesPageIdStatus
 */
async function fetchStatusIndicatorLevel(): Promise<StatusIndicatorLevel> {
	const response = await fetch("https://status.ngrok.com/api/v2/status.json");

	if (!response.ok) {
		throw new Error(`Failed to fetch status: ${response.statusText}`);
	}

	const data: unknown = await response.json();
	const status = typeof data === "object" && data != null && "status" in data ? data.status : null;
	const level =
		typeof status === "object" && status != null && "indicator" in status
			? status.indicator
			: undefined;
	if (!isStatusIndicatorLevel(level)) {
		throw new Error(`Unknown status indicator: ${String(level)}`);
	}
	return level;
}

/**
 * Fetches and polls the ngrok service status from Atlassian Statuspage every 5 minutes.
 */
function useStatusPageStatus() {
	return useQuery({
		queryKey: ["statuspage", "status"],
		queryFn: fetchStatusIndicatorLevel,
		// Refetch every 5 minutes
		refetchInterval: 300_000,
		// Pause polling when the tab is inactive to avoid unnecessary API calls
		refetchIntervalInBackground: false,
		staleTime: 300_000, // stale time of 5 minutes
		// Don't retry on failure - we'll fall back to default message
		retry: false,
	});
}

export {
	//,
	useStatusPageStatus,
	type StatusIndicator,
	type StatusIndicatorLevel,
	getConfigForStatusIndicatorLevel,
};

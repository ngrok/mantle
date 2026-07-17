import type { Theme } from "@ngrok/mantle/theme";
import { themes } from "@ngrok/mantle/theme";
import { matchSorter, rankings } from "match-sorter";
import type { href } from "react-router";
import {
	basePages,
	baseRoutes,
	componentCategories,
	componentsByCategory,
	hooksRoute,
	layoutPages,
	layoutRoutes,
	previewComponents,
	previewComponentsRouteLookup,
	prodReadyComponentRouteLookup,
	utilsPages,
	utilsRoutes,
	welcomePages,
	welcomeRoutes,
} from "~/components/navigation-data";
import { releaseHref } from "~/utilities/release-href";

type Route = Parameters<typeof href>[0];

/**
 * The command palette group that holds preview components. Exported so the
 * palette can decorate this group's heading (and its items in search results)
 * with the preview badge.
 */
export const previewComponentsGroup = "Preview Components";

type PaletteCommandBase = {
	/** Stable unique identity; used as the cmdk selection value. */
	id: string;
	/** The visible name of the command; the primary search target. */
	title: string;
	/** The browse-view group heading the command belongs to. */
	group: string;
	/**
	 * Muted hint rendered next to the title (a docs route, repo slug, …); the
	 * secondary search target.
	 */
	subtitle?: string;
	/**
	 * Extra search-only terms, matched as substrings and never rendered — e.g.
	 * the route of a welcome page whose row intentionally shows no subtitle.
	 */
	keywords?: string[];
};

/** A palette command that navigates to an internal docs route. */
export type RoutePaletteCommand = PaletteCommandBase & {
	kind: "route";
	/** The internal route the command navigates to. */
	to: Route;
	/** Whether the target page documents a preview component. */
	preview?: boolean;
};

/** A palette command that opens an external URL in a new tab. */
export type ExternalPaletteCommand = PaletteCommandBase & {
	kind: "external";
	/** The external URL the command opens. */
	href: string;
};

/** A palette command that switches the site theme. */
export type ThemePaletteCommand = PaletteCommandBase & {
	kind: "theme";
	/** The theme the command applies. */
	theme: Theme;
};

/**
 * A single entry in the docs command palette: an internal navigation, an
 * external link, or a theme switch.
 */
export type PaletteCommand = RoutePaletteCommand | ExternalPaletteCommand | ThemePaletteCommand;

/** The visible title for each theme-switching command. */
const themeCommandTitles = {
	system: "Use System theme",
	light: "Use Light theme",
	dark: "Use Dark theme",
	"light-high-contrast": "Use Light High Contrast theme",
	"dark-high-contrast": "Use Dark High Contrast theme",
} as const satisfies Record<Theme, string>;

type RouteCommandOptions = {
	title: string;
	to: Route;
	group: string;
	subtitle?: string;
	keywords?: string[];
	preview?: boolean;
};

function routeCommand({
	title,
	to,
	group,
	subtitle,
	keywords,
	preview,
}: RouteCommandOptions): RoutePaletteCommand {
	return {
		kind: "route",
		id: to,
		title,
		group,
		to,
		...(subtitle != null ? { subtitle } : {}),
		...(keywords != null ? { keywords } : {}),
		...(preview != null ? { preview } : {}),
	};
}

/**
 * Builds every command the docs palette offers, in browse display order:
 * Welcome (docs pages plus the GitHub links), Base, Hooks, Utils, one group
 * per component category, Layouts, Preview Components, and Theme.
 *
 * Pure: derives everything from `navigation-data` and the given version, so
 * a page missing here means it is missing from `navigation-data` itself.
 *
 * @example
 * ```ts
 * const commands = buildPaletteCommands("4.2.0");
 * commands[0]; // { kind: "route", title: "Overview & Setup", to: "/", group: "Welcome" }
 * ```
 */
export function buildPaletteCommands(mantleVersion: string): PaletteCommand[] {
	return [
		...welcomePages.map((page) =>
			// welcome rows show no subtitle, so their route rides along as a
			// search-only keyword to keep path-shaped queries working
			routeCommand({
				title: page,
				to: welcomeRoutes[page],
				group: "Welcome",
				keywords: [welcomeRoutes[page]],
			}),
		),
		{
			kind: "external",
			id: "github-repo",
			title: "GitHub Repo",
			subtitle: "ngrok/mantle",
			group: "Welcome",
			href: "https://github.com/ngrok/mantle",
		},
		{
			kind: "external",
			id: "github-releases",
			title: "GitHub Releases",
			subtitle: `version ${mantleVersion}`,
			group: "Welcome",
			href: releaseHref(mantleVersion),
		},
		...basePages.map((page) =>
			routeCommand({
				title: page,
				to: baseRoutes[page],
				group: "Base",
				subtitle: baseRoutes[page],
			}),
		),
		routeCommand({ title: "Hooks", to: hooksRoute, group: "Hooks", subtitle: hooksRoute }),
		...utilsPages.map((page) =>
			routeCommand({
				title: page,
				to: utilsRoutes[page],
				group: "Utils",
				subtitle: utilsRoutes[page],
			}),
		),
		...componentCategories.flatMap((category) =>
			componentsByCategory[category].map((component) =>
				routeCommand({
					title: component,
					to: prodReadyComponentRouteLookup[component],
					group: `Components: ${category}`,
					subtitle: prodReadyComponentRouteLookup[component],
				}),
			),
		),
		...layoutPages.map((page) =>
			routeCommand({
				title: page,
				to: layoutRoutes[page],
				group: "Layouts",
				subtitle: layoutRoutes[page],
			}),
		),
		...previewComponents.map((component) =>
			routeCommand({
				title: component,
				to: previewComponentsRouteLookup[component],
				group: previewComponentsGroup,
				subtitle: previewComponentsRouteLookup[component],
				preview: true,
			}),
		),
		...themes.map(
			(theme): ThemePaletteCommand => ({
				kind: "theme",
				id: `theme-${theme}`,
				title: themeCommandTitles[theme],
				group: "Theme",
				theme,
			}),
		),
	];
}

/** A browse-view group: its heading and the commands it contains, in order. */
export type PaletteCommandGroup = {
	group: string;
	commands: PaletteCommand[];
};

/**
 * Partitions commands into their browse-view groups, preserving both group
 * order (first occurrence) and command order within each group.
 *
 * @example
 * ```ts
 * const groups = groupPaletteCommands(buildPaletteCommands("4.2.0"));
 * groups[0].group; // "Welcome"
 * ```
 */
export function groupPaletteCommands(commands: readonly PaletteCommand[]): PaletteCommandGroup[] {
	const groups = new Map<string, PaletteCommand[]>();
	for (const command of commands) {
		const existing = groups.get(command.group);
		if (existing) {
			existing.push(command);
		} else {
			groups.set(command.group, [command]);
		}
	}
	return Array.from(groups, ([group, groupCommands]) => ({ group, commands: groupCommands }));
}

/**
 * Ranks palette commands against a search query, best match first. An empty
 * (or whitespace-only) query returns every command in browse order.
 *
 * Titles are the primary signal and match fuzzily (exact > prefix > word
 * prefix > substring > acronym > fuzzy). Subtitles and keywords (route paths,
 * the repo slug) are secondary and must contain the query as a real
 * substring — fuzzy path matching is how "tabs" used to surface Tailwind
 * Variants via `/base/tailwind-variants`. Any title match, however weak,
 * outranks a subtitle/keyword-only match; within each tier, ties break
 * alphabetically.
 *
 * The two signals are ranked as separate passes because a per-key
 * `threshold` in match-sorter does not scope to its key: the whole item is
 * gated by the threshold of whichever key ranked highest, so a sub-CONTAINS
 * subtitle match would veto a qualifying fuzzy title match and drop the
 * command entirely (e.g. "go" losing "GitHub Repo").
 *
 * @example
 * ```ts
 * searchPaletteCommands(commands, "tabs")[0].title; // "Tabs"
 * ```
 */
export function searchPaletteCommands(
	commands: readonly PaletteCommand[],
	query: string,
): PaletteCommand[] {
	const search = query.trim();
	if (!search) {
		return [...commands];
	}
	const byTitle = matchSorter([...commands], search, { keys: ["title"] });
	const bySecondary = matchSorter([...commands], search, {
		keys: ["subtitle", "keywords"],
		threshold: rankings.CONTAINS,
	});
	const titleMatchIds = new Set(byTitle.map((command) => command.id));
	return [...byTitle, ...bySecondary.filter((command) => !titleMatchIds.has(command.id))];
}

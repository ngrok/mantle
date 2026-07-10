// `?raw` lets Vite bundle the package CHANGELOG verbatim so this loader
// works in both dev and the bundled SSR output (where `import.meta.url`
// points into `build/server/...` and would resolve the wrong path).
import changelogMarkdown from "../../../../packages/mantle/CHANGELOG.md?raw";
import { canonicalOrigin } from "~/utilities/canonical-origin";

/**
 * One change entry inside a published version. Mirrors the line shape
 * `@changesets/cli` emits — the only producer of `CHANGELOG.md` here.
 */
export type ChangelogChange = {
	/** Bump category — inferred from the parent `### {Bump} Changes` heading. */
	bump: "major" | "minor" | "patch";
	/** Markdown body the changeset author wrote, with the metadata preamble trimmed off. */
	summary: string;
	/** Pull request URL extracted from the leading `[#NN](url)` link, when present. */
	pr?: string;
	/** Commit URL extracted from the inline `[`sha`](url)` link, when present. */
	commit?: string;
	/** GitHub username from the `Thanks [@user]` shoutout, without the leading `@`. */
	author?: string;
};

export type ChangelogVersion = {
	/** Semver string from the `## X.Y.Z` heading. */
	version: string;
	changes: ChangelogChange[];
};

export type Changelog = {
	package: "@ngrok/mantle";
	origin: string;
	versions: ChangelogVersion[];
};

/**
 * Map a `### {Heading} Changes` line to a semver bump. Returns `null`
 * for any other heading so the parser ignores stray sections (e.g. a
 * `### Notes` or release-template heading occasionally seen in
 * changesets-published changelogs).
 */
function bumpFromHeading(heading: string): ChangelogChange["bump"] | null {
	const normalized = heading.trim().toLowerCase();
	if (normalized.startsWith("major")) {
		return "major";
	}
	if (normalized.startsWith("minor")) {
		return "minor";
	}
	if (normalized.startsWith("patch")) {
		return "patch";
	}
	return null;
}

/**
 * Peel the changesets metadata preamble off the start of a bullet body,
 * returning each piece (PR link, commit link, author) plus the residual
 * markdown. Each piece is optional and consumed in the order changesets
 * normally emits them; partial-metadata bodies still parse cleanly.
 *
 * Only operates at the start of the body, so prose that happens to
 * mention `Thanks` or `[@someone]` mid-sentence isn't mangled.
 *
 * Exported for unit tests — callers should use {@link buildChangelog}.
 */
export function parseChangeBody(
	raw: string,
): Pick<ChangelogChange, "summary" | "pr" | "commit" | "author"> {
	let remaining = raw.trimStart();
	let pr: string | undefined;
	let commit: string | undefined;
	let author: string | undefined;

	const prMatch = remaining.match(/^\[#\d+\]\((https?:\/\/[^)]+)\)\s*/);
	if (prMatch) {
		pr = prMatch[1];
		remaining = remaining.slice(prMatch[0].length);
	}

	const commitMatch = remaining.match(/^\[`[0-9a-f]{6,40}`\]\((https?:\/\/[^)]+)\)\s*/);
	if (commitMatch) {
		commit = commitMatch[1];
		remaining = remaining.slice(commitMatch[0].length);
	}

	const authorMatch = remaining.match(/^Thanks\s+\[@([^\]]+)\]\([^)]+\)!\s*/);
	if (authorMatch) {
		author = authorMatch[1];
		remaining = remaining.slice(authorMatch[0].length);
	}

	remaining = remaining.replace(/^-\s*/, "").trim();

	return { summary: remaining, pr, commit, author };
}

/**
 * Walk the line stream and emit one entry per top-level `- ` bullet
 * under a `### {Bump} Changes` heading. Continuation lines (two-space
 * indents and blank paragraph separators) fold into the prior bullet so
 * multi-paragraph changeset bodies — including before/after code blocks
 * — survive intact.
 *
 * Inside a fenced code block, every line is treated as content. Without
 * this, a snippet that starts with `- ` or `## ` would be mistaken for a
 * new bullet or version heading.
 *
 * Exported for unit tests — callers should use {@link buildChangelog}.
 */
export function parseVersions(source: string): ChangelogVersion[] {
	const lines = source.split("\n");
	const versions: ChangelogVersion[] = [];
	let currentVersion: ChangelogVersion | null = null;
	let currentBump: ChangelogChange["bump"] | null = null;
	let currentBody: string[] | null = null;
	let inFence = false;

	const flush = () => {
		if (!currentVersion || !currentBump || !currentBody) {
			return;
		}
		const raw = currentBody.join("\n").trim();
		if (raw.length === 0) {
			return;
		}
		currentVersion.changes.push({ bump: currentBump, ...parseChangeBody(raw) });
	};

	for (const line of lines) {
		if (line.startsWith("```")) {
			inFence = !inFence;
			currentBody?.push(line);
			continue;
		}

		if (inFence) {
			currentBody?.push(line);
			continue;
		}

		const versionString = line.match(/^##\s+([0-9]+\.[0-9]+\.[0-9]+(?:-[\w.]+)?)\s*$/)?.[1];
		if (versionString) {
			flush();
			currentBody = null;
			currentBump = null;
			currentVersion = { version: versionString, changes: [] };
			versions.push(currentVersion);
			continue;
		}

		const bumpHeading = line.match(/^###\s+(.+?)\s*$/)?.[1];
		if (bumpHeading) {
			flush();
			currentBody = null;
			currentBump = bumpFromHeading(bumpHeading);
			continue;
		}

		if (!currentVersion || !currentBump) {
			continue;
		}

		if (line.startsWith("- ")) {
			flush();
			currentBody = [line.slice(2)];
			continue;
		}

		if (currentBody && (line.startsWith("  ") || line.trim() === "")) {
			currentBody.push(line.startsWith("  ") ? line.slice(2) : line);
			continue;
		}

		flush();
		currentBody = null;
	}

	flush();
	return versions;
}

let cached: Changelog | null = null;
/**
 * Parse `packages/mantle/CHANGELOG.md` into a structured shape suitable
 * for `/api/changelog.json`. Cached for the process lifetime — the file
 * is regenerated at release time, well outside the request path.
 */
export async function buildChangelog(): Promise<Changelog> {
	if (cached) {
		return cached;
	}
	cached = {
		package: "@ngrok/mantle",
		origin: canonicalOrigin,
		versions: parseVersions(changelogMarkdown),
	};
	return cached;
}

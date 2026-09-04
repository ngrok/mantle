import { IconButton } from "@ngrok/mantle/button";
import { Popover } from "@ngrok/mantle/popover";
import { BracketsCurlyIcon } from "@phosphor-icons/react/BracketsCurly";
import type { ReactNode } from "react";
import { useLocation, useMatches } from "react-router";

/** One labeled block of router state. */
function DebugField({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<p className="text-muted font-mono text-xs">{label}</p>
			{children}
		</div>
	);
}

/**
 * The keys a route's `handle` export carries, or a dash for a route that
 * exports none. This is what tells a reader which matches feed the trail.
 */
function handleKeys(handle: unknown): string {
	if (handle == null || typeof handle !== "object") {
		return "—";
	}
	const keys = Object.keys(handle);
	return keys.length === 0 ? "—" : keys.join(", ");
}

/**
 * A header toggle that shows the router state the trail derives from: the
 * current `pathname`, the raw `location.state`, and every match with its
 * cumulative `pathname` and `handle` keys. Demo chrome, not part of the
 * recipe: it exists so a reader can watch `location.state` change as they
 * follow origin links, press Back, and reload.
 *
 * @example
 * ```tsx
 * <AppLayout.Header>
 * 	<RouteBreadcrumbs />
 * 	<div className="ml-auto">
 * 		<RouterDebugPopover />
 * 	</div>
 * </AppLayout.Header>
 * ```
 */
function RouterDebugPopover() {
	const location = useLocation();
	const matches = useMatches();

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<IconButton
					type="button"
					appearance="outlined"
					intent="neutral"
					size="sm"
					label="Show router state"
					icon={<BracketsCurlyIcon />}
				/>
			</Popover.Trigger>
			<Popover.Content align="end" preferredWidth="max-w-lg" className="flex flex-col gap-4">
				<DebugField label="location.pathname">
					<code translate="no" className="text-strong text-xs break-all">
						{location.pathname}
					</code>
				</DebugField>
				<DebugField label="location.state">
					<pre
						translate="no"
						className="bg-base text-strong max-h-48 overflow-auto rounded-md p-2 text-xs"
					>
						{JSON.stringify(location.state, null, 2) ?? "undefined"}
					</pre>
				</DebugField>
				<DebugField label="useMatches()">
					<ol className="flex flex-col gap-1.5 text-xs" translate="no">
						{matches.map((match) => (
							<li key={match.id} className="flex flex-col gap-0.5">
								<code className="text-strong break-all">{match.pathname}</code>
								<span className="text-muted">
									id: {match.id} · handle: {handleKeys(match.handle)}
								</span>
							</li>
						))}
					</ol>
				</DebugField>
			</Popover.Content>
		</Popover.Root>
	);
}

export {
	//,
	RouterDebugPopover,
};

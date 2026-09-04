import type { ComponentProps } from "react";
import { Link, useLocation, useMatches, useResolvedPath } from "react-router";
import { findSelfOrigin, pushOrigin, readOriginTrail } from "./origin-trail";

type OriginLinkProps = Omit<ComponentProps<typeof Link>, "state">;

/**
 * A `Link` that carries the origin trail to its target, so the target page
 * shows where the reader came from. Use it for a link from one resource to
 * another. A plain `Link` drops the trail, which is right for the sidebar, a
 * table row, and a redirect: the choice is visible at the link.
 *
 * The trail is computed during render from `location.state` and the matched
 * chain. The `state` prop is not DOM, so it needs no hydration gate.
 *
 * @example
 * ```tsx
 * <OriginLink to={href("/domains/:domainId", { domainId })}>{domain.name}</OriginLink>
 * ```
 */
function OriginLink({ to, prefetch = "intent", ...props }: OriginLinkProps) {
	const location = useLocation();
	const matches = useMatches();
	// resolve `to` the way Link does, so a relative target compares by pathname
	const target = useResolvedPath(to);
	const trail = pushOrigin(
		readOriginTrail(location.state),
		findSelfOrigin(matches),
		target.pathname,
	);

	return <Link {...props} to={to} prefetch={prefetch} state={{ origin: trail }} />;
}

export {
	//,
	OriginLink,
};

import { useIsHydrated } from "@ngrok/mantle/hooks";
import { Navigate, useLocation } from "react-router";
import type { Route } from "./+types/endpoint-index";
import { isEndpointType } from "./fixtures";
import { demoPaths } from "./paths";

/**
 * The endpoint's bare URL, which is its resource root: it redirects to the
 * Overview tab. The redirect forwards `location.state`, because an origin
 * crumb links to the resource root, and a `Navigate` with no `state` would
 * drop the trail the reader is following back. It renders only after
 * hydration, so the server and the hydration pass render the same nothing.
 */
export default function EndpointIndex({ params }: Route.ComponentProps) {
	const isHydrated = useIsHydrated();
	const location = useLocation();

	if (!isHydrated || !isEndpointType(params.endpointType)) {
		return null;
	}

	return (
		<Navigate
			to={demoPaths.endpointTab(params.endpointType, params.endpointId, "overview")}
			replace
			state={location.state}
		/>
	);
}

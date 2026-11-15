import {
	InlineActionsQueryExample,
	QueryExample,
	RemoteQueryExample,
	TokenColorsQueryExample,
} from "~/features/query-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Query docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<QueryExample />
		</PreviewCanvas>
	);
}

/** The "Inline actions and a footer" example on the Query docs page. */
export function InlineActionsAndAFooterExample() {
	return (
		<PreviewCanvas>
			<InlineActionsQueryExample />
		</PreviewCanvas>
	);
}

/** The "Search on the server" example on the Query docs page. */
export function SearchOnTheServerExample() {
	return (
		<PreviewCanvas>
			<RemoteQueryExample />
		</PreviewCanvas>
	);
}

/** The "Token colors" example on the Query docs page. */
export function TokenColorsExample() {
	return (
		<PreviewCanvas>
			<TokenColorsQueryExample />
		</PreviewCanvas>
	);
}

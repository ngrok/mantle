import {
	InlineActionsQueryExample,
	KeyboardShortcutQueryExample,
	QueryExample,
	RemoteQueryExample,
	TokenColorsQueryExample,
} from "~/features/query-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Query docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<QueryExample />
		</PreviewCanvas>
	);
}

/** The "Inline actions and a footer" example on the Query docs page. */
export function InlineActionsAndAFooterExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<InlineActionsQueryExample />
		</PreviewCanvas>
	);
}

/** The "Search on the server" example on the Query docs page. */
export function SearchOnTheServerExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<RemoteQueryExample />
		</PreviewCanvas>
	);
}

/** The "Token colors" example on the Query docs page. */
export function TokenColorsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<TokenColorsQueryExample />
		</PreviewCanvas>
	);
}

/** The "Keyboard shortcut" example on the Query docs page. */
export function KeyboardShortcutExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<KeyboardShortcutQueryExample />
		</PreviewCanvas>
	);
}

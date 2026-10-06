import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import {
	historyEdges,
	parsePreviewHistoryGoMessage,
	type PreviewHistory,
	previewHistoryMessage,
	readNavigationApi,
	recordNavigation,
	startPreviewHistory,
} from "./preview-history";

/**
 * The framed side of the preview toolbar's Back and Forward buttons. After
 * each navigation it reports where the frame's history can move, and it moves
 * by one entry when the docs page asks. Renders nothing. Opened in its own
 * tab, it does nothing: there is no toolbar to report to.
 *
 * The report comes from the browser's Navigation API where there is one,
 * because it also counts the documents before a full page load (a link
 * followed before hydration). Without it, a stack tracked from the router's
 * navigations stands in; that stack starts over on a full load.
 *
 * Messages stay same-origin in both directions: the report goes to
 * `window.parent` at this origin, and a request is honored only from
 * `window.parent` at this origin.
 *
 * @example
 * ```tsx
 * {isFramedPreview && <FramedPreviewHistory />}
 * ```
 */
function FramedPreviewHistory() {
	const location = useLocation();
	const navigationType = useNavigationType();
	const navigate = useNavigate();
	const historyRef = useRef<PreviewHistory | null>(null);

	useEffect(() => {
		if (window.parent === window) {
			return;
		}
		const history =
			historyRef.current == null
				? startPreviewHistory(location.key)
				: recordNavigation(historyRef.current, location.key, navigationType);
		historyRef.current = history;
		const edges = readNavigationApi(window) ?? historyEdges(history);
		window.parent.postMessage(previewHistoryMessage(edges), window.location.origin);
	}, [location.key, navigationType]);

	useEffect(() => {
		if (window.parent === window) {
			return;
		}
		function onMessage(event: MessageEvent) {
			if (event.origin !== window.location.origin || event.source !== window.parent) {
				return;
			}
			const request = parsePreviewHistoryGoMessage(event.data);
			if (request != null) {
				void navigate(request.delta);
			}
		}
		window.addEventListener("message", onMessage);
		return () => {
			window.removeEventListener("message", onMessage);
		};
	}, [navigate]);

	return null;
}

export {
	//,
	FramedPreviewHistory,
};

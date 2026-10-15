import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { NonceProvider, readDocumentNonce } from "./components/nonce";

// Why: the server stamps its nonce on every `<link>` and `<script>` it
// renders with one. A client render with an empty nonce disagrees with that
// markup, and React reports a hydration mismatch on each of them.
const nonce = readDocumentNonce(document);

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<NonceProvider value={nonce}>
				<HydratedRouter />
			</NonceProvider>
		</StrictMode>,
	);
});

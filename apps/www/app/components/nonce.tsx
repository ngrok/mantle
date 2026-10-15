import { createContext, useContext } from "react";

const nonceContext = createContext<string>("");

/**
 * Carries the request-unique nonce for the current request.
 *
 * This nonce is used for Content Security Policy (CSP) to allow inline scripts.
 * Render it in the server entry, above `ServerRouter`, and in the client entry
 * with the value {@link readDocumentNonce} returns, so both renders stamp the
 * same nonce and hydration matches.
 */
const NonceProvider = nonceContext.Provider;

/**
 * Reads the request-unique nonce.
 *
 * This nonce is used for Content Security Policy (CSP) to allow inline scripts.
 */
const useNonce = () => useContext(nonceContext);

/**
 * Reads the nonce the server minted for this document, from the first script
 * that carries one, or `""` when none does. The browser hides the `nonce`
 * attribute of an element under a CSP but keeps the `nonce` property, so the
 * property is read first.
 *
 * @example
 * ```tsx
 * <NonceProvider value={readDocumentNonce(document)}>
 *   <HydratedRouter />
 * </NonceProvider>
 * ```
 */
function readDocumentNonce(document: Document): string {
	const script = document.querySelector<HTMLScriptElement>("script[nonce]");
	if (script == null) {
		return "";
	}
	return script.nonce || script.getAttribute("nonce") || "";
}

export {
	//,
	NonceProvider,
	readDocumentNonce,
	useNonce,
};

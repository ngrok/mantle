import { createContext, useContext } from "react";

const nonceContext = createContext<string>("");

/**
 * Carries the request-unique nonce for the current request.
 *
 * This nonce is used for Content Security Policy (CSP) to allow inline scripts.
 * Render it in the server entry, above `ServerRouter`.
 */
const NonceProvider = nonceContext.Provider;

/**
 * Reads the request-unique nonce.
 *
 * This nonce is used for Content Security Policy (CSP) to allow inline scripts.
 */
const useNonce = () => useContext(nonceContext);

export {
	//,
	NonceProvider,
	useNonce,
};

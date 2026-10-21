import { canUseDOM } from "@ngrok/mantle/browser-only";
import { createContext, useContext } from "react";
import { canonicalOrigin } from "./canonical-origin";

const getDefaultBaseUrl = () => {
	if (import.meta.env.DEV) {
		return "/";
	}
	return import.meta.env.BASE_URL || canonicalOrigin;
};

const BaseUrlContext = createContext<string>(getDefaultBaseUrl());

const BaseUrlProvider = BaseUrlContext.Provider;

const useBaseUrl = () => useContext(BaseUrlContext);

/**
 * Resolve the base URL for the application.
 *
 * Priority order:
 * 1. Client-side: `window.location.origin`
 * 2. Server-side: `process.env.BASE_URL` or `import.meta.env.BASE_URL`
 * 3. Fallback: `"/"` (local dev)
 *
 * @param requestUrl - Optional request URL for server-side fallback to origin
 * @returns The resolved base URL, with trailing slashes removed
 *
 * @example
 * // Client: "https://ngrok.com"
 * // Server (preview): "https://ngrok-mantle-pr-123.vercel.app"
 * // Server (local): "/"
 * const baseUrl = getBaseUrl();
 */
function getBaseUrl(requestUrl?: string | null): string {
	// Client-side: use window origin
	if (canUseDOM()) {
		return window.location.origin;
	}

	// Server-side: try env vars first
	const baseUrlEnv = trimTrailingSlashes(
		process.env.BASE_URL?.trim() || import.meta.env.BASE_URL?.trim(),
	);

	// If we have a request URL and no env var, use request origin
	if (!baseUrlEnv && requestUrl) {
		return new URL(requestUrl).origin;
	}

	// Fallback to env var or "/"
	return baseUrlEnv || "/";
}

export {
	//,
	BaseUrlProvider,
	getBaseUrl,
	useBaseUrl,
};

/**
 * Removes all trailing slashes from a string.
 *
 * O(n) time complexity
 *
 * @example given "/foo/bar/" returns "/foo/bar"
 * @example given "/foo/bar/////" returns "/foo/bar"
 */
function trimTrailingSlashes(value: string | undefined | null): string {
	return (value || "").replace(/\/+$/, "");
}

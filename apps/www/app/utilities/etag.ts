import { createHash } from "node:crypto";

/**
 * Compute a strong ETag for an HTTP response body.
 *
 * Uses the first 16 hex chars (64 bits) of SHA-256 — vastly more collision
 * resistance than needed for cache validation, while keeping the header
 * compact. The returned value is wrapped in double quotes per RFC 9110,
 * so callers can drop it directly into the `ETag` response header and
 * compare against `If-None-Match` without further escaping.
 *
 * @example
 * const etag = etagFor(body);
 * if (request.headers.get("If-None-Match") === etag) {
 *   return new Response(null, { status: 304, headers: { ETag: etag } });
 * }
 */
export function etagFor(body: string | Uint8Array): string {
	return `"${createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;
}

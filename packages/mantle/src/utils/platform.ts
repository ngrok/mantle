/**
 * Type guard for `navigator.userAgentData` existence — the modern UA-hints
 * surface, where `platform` is a plain token like `"macOS"`.
 */
function hasUserAgentData(
	navigator: Navigator,
): navigator is Navigator & { userAgentData: { platform?: string } } {
	return "userAgentData" in navigator;
}

/**
 * Whether the host is an Apple platform (macOS, iOS, iPadOS). This is the
 * predicate that decides which modifier a keyboard shortcut must match:
 * `event.metaKey` (`⌘`) on Apple platforms, `event.ctrlKey` everywhere else.
 * The two never substitute for each other — accepting either would hijack
 * macOS's native `Ctrl+B` / `Ctrl+A` / `Ctrl+E` emacs-style caret bindings,
 * which every macOS text field implements.
 *
 * SSR-safe: returns `false` when `navigator` is unavailable, matching the
 * non-Apple default. Call it from an effect or an event handler rather than
 * during render — a render-time call disagrees with the server on Apple
 * platforms and produces a hydration mismatch.
 *
 * @example
 * ```ts
 * const isApple = isApplePlatform();
 * const platformModifier = isApple ? event.metaKey : event.ctrlKey;
 * const foreignModifier = isApple ? event.ctrlKey : event.metaKey;
 * if (event.key === "b" && platformModifier && !foreignModifier) {
 *   event.preventDefault();
 * }
 * ```
 */
function isApplePlatform(): boolean {
	if (typeof navigator === "undefined") {
		return false;
	}

	let platform = "";

	if (hasUserAgentData(navigator)) {
		platform = navigator.userAgentData.platform ?? "";
	}

	if (!platform) {
		// Why: `navigator.platform` is deprecated, but `userAgentData` ships only
		// in Chromium — Safari and Firefox expose no replacement, and Safari is
		// the browser where resolving this wrong matters most. The `userAgent`
		// fallback covers engines that report an empty `platform`.
		platform = navigator.platform || navigator.userAgent || "";
	}

	return /mac|iphone|ipad|ipod/i.test(platform);
}

export {
	//,
	isApplePlatform,
};

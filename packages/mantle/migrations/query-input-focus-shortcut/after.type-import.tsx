import type { FocusShortcut } from "@ngrok/mantle/focus-shortcut";
import { Query } from "@ngrok/mantle/query";

// A type-only `FocusShortcut` import leaves the value unbound, so the field stays.
export type Hint = typeof FocusShortcut.Hint;

export function TypeOnly() {
	return <Query.Input aria-label="Filter" keyboardShortcut />;
}

// `{false}` still goes, because it needs no wrapper.
export function Off() {
	return <Query.Input aria-label="Filter" />;
}

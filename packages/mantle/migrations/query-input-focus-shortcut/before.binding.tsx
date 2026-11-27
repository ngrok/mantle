import { Query } from "@ngrok/mantle/query";

// A local `FocusShortcut` would capture the wrapper, so the file stays.
const FocusShortcut = { label: "Press /" };

export function Bound() {
	return <Query.Input aria-label={FocusShortcut.label} keyboardShortcut />;
}

// `{false}` still goes, because it needs no wrapper.
export function Off() {
	return <Query.Input aria-label="Filter" keyboardShortcut={false} />;
}

export { FocusShortcut };

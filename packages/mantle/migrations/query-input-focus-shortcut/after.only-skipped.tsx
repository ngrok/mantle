import { Query } from "@ngrok/mantle/query";

// The only field is skipped, so the file gets no import.
export function Spread(props: { keyboardShortcut?: boolean }) {
	return <Query.Input aria-label="Filter" keyboardShortcut {...props} />;
}

// `{false}` still goes, and adds no import.
export function Off() {
	return <Query.Input aria-label="Filter" />;
}

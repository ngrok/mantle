import { Button } from "@ngrok/mantle/button";
import { Query } from "@ngrok/mantle/query";
import { Query as MantleQuery } from "@ngrok/mantle/query";
import { Query as OtherQuery } from "other-library";

// A literal `keyboardShortcut`.
export function Bare() {
	return (
	<Query.Input aria-label="Filter" keyboardShortcut placeholder="Filter" />
	);
}

// The literal `{true}`, a comment, and a handler after the attribute.
export function LiteralTrue() {
	return (
		<Query.Input
			aria-label="Filter"
			// The one primary filter on the page.
			keyboardShortcut={true}
			onClear={() => {}}
			placeholder="Filter"
		/>
	);
}

// Inline actions stay after the hint.
export function WithChildren() {
	return (
		<Query.Input aria-label="Filter" keyboardShortcut placeholder="Filter">
			<Button appearance="ghost" type="button">
				Save
			</Button>
		</Query.Input>
	);
}

// An aliased import.
export function Aliased() {
	return (
	<MantleQuery.Input aria-label="Filter" keyboardShortcut placeholder="Filter" />
	);
}

// `{false}` was the default, so the attribute goes.
export function Off() {
	return <Query.Input aria-label="Filter" keyboardShortcut={false} placeholder="Filter" />;
}

// A forwarded value stays, so the type checker names the call site.
export function Forwarded({ keyboardShortcut }: { keyboardShortcut: boolean }) {
	return (
	<Query.Input aria-label="Filter" keyboardShortcut={keyboardShortcut} placeholder="Filter" />
	);
}

// Another library's `Query` stays.
export function Other() {
	return <OtherQuery.Input keyboardShortcut />;
}

// A local that shadows the import stays.
export function Shadowed({ Query }: { Query: typeof OtherQuery }) {
	return <Query.Input keyboardShortcut />;
}

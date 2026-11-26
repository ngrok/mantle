import { Button } from "@ngrok/mantle/button";
import { FocusShortcut } from "@ngrok/mantle/focus-shortcut";
import { Query } from "@ngrok/mantle/query";
import { Query as MantleQuery } from "@ngrok/mantle/query";
import { Query as OtherQuery } from "other-library";

// A literal `keyboardShortcut`.
export function Bare() {
	return (
		<FocusShortcut.Root>
			<FocusShortcut.Field>
				<Query.Input aria-label="Filter" placeholder="Filter">
					<FocusShortcut.Hint />
				</Query.Input>
			</FocusShortcut.Field>
		</FocusShortcut.Root>
	);
}

// The literal `{true}`, a comment, and a handler after the attribute.
export function LiteralTrue() {
	return (
		<FocusShortcut.Root>
			<FocusShortcut.Field>
				<Query.Input
					aria-label="Filter"
					// The one primary filter on the page.
					onClear={() => {}}
					placeholder="Filter"
				>
					<FocusShortcut.Hint />
				</Query.Input>
			</FocusShortcut.Field>
		</FocusShortcut.Root>
	);
}

// Inline actions stay after the hint.
export function WithChildren() {
	return (
		<FocusShortcut.Root>
			<FocusShortcut.Field>
				<Query.Input aria-label="Filter" placeholder="Filter">
					<FocusShortcut.Hint />
					<Button appearance="ghost" type="button">
						Save
					</Button>
				</Query.Input>
			</FocusShortcut.Field>
		</FocusShortcut.Root>
	);
}

// An aliased import.
export function Aliased() {
	return (
		<FocusShortcut.Root>
			<FocusShortcut.Field>
				<MantleQuery.Input aria-label="Filter" placeholder="Filter">
					<FocusShortcut.Hint />
				</MantleQuery.Input>
			</FocusShortcut.Field>
		</FocusShortcut.Root>
	);
}

// `{false}` was the default, so the attribute goes.
export function Off() {
	return <Query.Input aria-label="Filter" placeholder="Filter" />;
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

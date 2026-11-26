import { Button } from "@ngrok/mantle/button";
import { Field } from "@ngrok/mantle/field";
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

// A string or a comment that names the prop stays as it is.
export function InText() {
	return (
		<FocusShortcut.Root>
			<FocusShortcut.Field>
				<Query.Input
					aria-label="Filter"

					placeholder="Press keyboardShortcut to focus"
				>
					<FocusShortcut.Hint />
				</Query.Input>
			</FocusShortcut.Field>
		</FocusShortcut.Root>
	);
}

// A keyed field stays, so the type checker names the call site.
export function Keyed({ ids }: { ids: string[] }) {
	return ids.map((id) => (
		<Query.Input aria-label={id} key={id} keyboardShortcut placeholder="Filter" />
	));
}

// A later spread can turn the shortcut off, so the prop stays.
export function Spread(props: { keyboardShortcut?: boolean }) {
	return <Query.Input aria-label="Filter" keyboardShortcut placeholder="Filter" {...props} />;
}

// A `children` prop stays, so the hint does not replace it.
export function ChildrenProp() {
	return (
		<Query.Input
			aria-label="Filter"
			keyboardShortcut
			placeholder="Filter"
			// oxlint-disable-next-line react/no-children-prop -- Why: the fixture covers a `children` prop that the codemod must skip.
			children={<Button>Save</Button>}
		/>
	);
}

// Text children stay, because the hint beside them breaks a translated page.
export function TextChildren({ saved }: { saved: boolean }) {
	return (
		<Query.Input aria-label="Filter" keyboardShortcut placeholder="Filter">
			{saved && "Saved"}
		</Query.Input>
	);
}

// `Field.Control` passes its ref to its one child, so the field stays.
export function InFieldControl() {
	return (
		<Field.Control>
			<Query.Input keyboardShortcut placeholder="Filter" />
		</Field.Control>
	);
}

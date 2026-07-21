import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Main } from "@ngrok/mantle/main";
import type { PowerBarHandle } from "@ngrok/mantle/power-bar";
import { PowerBar } from "@ngrok/mantle/power-bar";
import { TextArea } from "@ngrok/mantle/text-area";
import { makeToast, Toast, Toaster } from "@ngrok/mantle/toast";
import { useRef, useState } from "react";

type Profile = {
	name: string;
	description: string;
};

const initialProfile: Profile = {
	name: "my-agent-endpoint",
	description: "Forwards traffic to the local dev server.",
};

/**
 * The hero PowerBar demo: a small settings form whose dirty state drives the
 * bar, with a simulated async save, a failure toggle that exercises
 * `PowerBar.Error`, and a navigation attempt that gets blocked with `shake()`
 * while changes are pending. Renders as a full preview document.
 */
export function PowerBarDemo() {
	const [saved, setSaved] = useState<Profile>(initialProfile);
	const [draft, setDraft] = useState<Profile>(initialProfile);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [failNextSave, setFailNextSave] = useState(false);
	const powerBarHandle = useRef<PowerBarHandle>(null);

	const isDirty = draft.name !== saved.name || draft.description !== saved.description;

	const save = () => {
		setIsPending(true);
		setError(null);
		// stand-in for the real request; fails on demand so the error row is visible
		window.setTimeout(() => {
			setIsPending(false);
			if (failNextSave) {
				setFailNextSave(false);
				setError("Something went wrong while saving. Try again.");
				return;
			}
			setSaved(draft);
			// the bar exits silently — announce the save's resolution yourself
			makeToast(
				<Toast.Root intent="success">
					<Toast.Icon />
					<Toast.Message>Changes saved</Toast.Message>
				</Toast.Root>,
			);
		}, 800);
	};

	const discard = () => {
		setDraft(saved);
		setError(null);
	};

	return (
		<Main className="min-h-full p-6">
			<Card.Root className="mx-auto max-w-xl">
				<Card.Body className="space-y-4">
					<Field.Item name="endpoint-name">
						<Field.Label>Endpoint name</Field.Label>
						<Field.Control>
							<Input
								onChange={(event) => setDraft({ ...draft, name: event.target.value })}
								value={draft.name}
							/>
						</Field.Control>
					</Field.Item>
					<Field.Item name="endpoint-description">
						<Field.Label>Description</Field.Label>
						<Field.Control>
							<TextArea
								onChange={(event) => setDraft({ ...draft, description: event.target.value })}
								value={draft.description}
							/>
						</Field.Control>
					</Field.Item>
					<Label className="flex items-center gap-2" htmlFor="fail-next-save">
						<Checkbox
							checked={failNextSave}
							id="fail-next-save"
							onChange={(event) => setFailNextSave(event.target.checked)}
						/>
						Fail the next save (shows the error row)
					</Label>
					<Button
						appearance="link"
						intent="neutral"
						type="button"
						onClick={() => {
							// stand-in for a router navigation guard: while dirty, the
							// navigation is blocked and the bar shakes + announces
							if (isDirty) {
								powerBarHandle.current?.shake();
							}
						}}
					>
						Continue to dashboard →
					</Button>
				</Card.Body>
			</Card.Root>

			<PowerBar.Root open={isDirty} handleRef={powerBarHandle}>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
				<PowerBar.Actions>
					<PowerBar.DiscardButton disabled={isPending} onClick={discard}>
						Discard
					</PowerBar.DiscardButton>
					<PowerBar.SaveButton isLoading={isPending} onClick={save}>
						{isPending ? "Saving…" : "Save changes"}
					</PowerBar.SaveButton>
				</PowerBar.Actions>
				{error != null && <PowerBar.Error>{error}</PowerBar.Error>}
			</PowerBar.Root>
			<Toaster />
		</Main>
	);
}

type Draft = {
	id: number;
	title: string;
};

const draftPosts: Draft[] = [
	{ id: 1, title: "Introducing the canvas chart family" },
	{ id: 2, title: "Traffic policy recipes for rate limiting" },
	{ id: 3, title: "What's new in the dashboard" },
];

/**
 * A non-save PowerBar: the pending decision is publishing drafts, so the bar
 * composes plain `Button`s, overrides the blocked-navigation announcement,
 * and lets `PowerBar.Message` name the panel. Renders as a full preview
 * document.
 */
export function PowerBarPendingPublishDemo() {
	const [pending, setPending] = useState<Draft[]>(draftPosts);
	const powerBarHandle = useRef<PowerBarHandle>(null);

	return (
		<Main className="min-h-full p-6">
			<Card.Root className="mx-auto max-w-xl">
				<Card.Body className="space-y-3">
					<h2 className="text-strong font-medium">Draft posts</h2>
					<ul className="text-muted list-inside list-disc text-sm">
						{pending.map((draft) => (
							<li key={draft.id}>{draft.title}</li>
						))}
					</ul>
					{pending.length === 0 && <p className="text-muted text-sm">All drafts published.</p>}
					<Button
						appearance="link"
						intent="neutral"
						type="button"
						onClick={() => {
							if (pending.length > 0) {
								powerBarHandle.current?.shake({
									announcement: "Publish or discard your drafts before leaving.",
								});
							}
						}}
					>
						Continue to dashboard →
					</Button>
				</Card.Body>
			</Card.Root>

			<PowerBar.Root open={pending.length > 0} handleRef={powerBarHandle}>
				<PowerBar.Message>
					{pending.length} draft {pending.length === 1 ? "post" : "posts"} pending publish
				</PowerBar.Message>
				<PowerBar.Actions>
					<Button
						appearance="outlined"
						intent="neutral"
						type="button"
						onClick={() => setPending([])}
					>
						Discard drafts
					</Button>
					<Button appearance="filled" intent="neutral" type="button" onClick={() => setPending([])}>
						Publish all
					</Button>
				</PowerBar.Actions>
			</PowerBar.Root>
		</Main>
	);
}

import { Alert } from "@ngrok/mantle/alert";
import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Main } from "@ngrok/mantle/main";
import type { SandbarHandle } from "@ngrok/mantle/sandbar";
import { Sandbar } from "@ngrok/mantle/sandbar";
import { TextArea } from "@ngrok/mantle/text-area";
import { makeToast, Toast, Toaster } from "@ngrok/mantle/toast";
import type { PropsWithChildren } from "react";
import { useRef, useState } from "react";

/**
 * The failed-save report, rendered where the failure happened — inside the form,
 * not on the bar. The bar carries the *pending decision*; a failure is about the
 * content the user is looking at, so it belongs next to it.
 *
 * `role="alert"` plus focus on mount is what makes it reliably announced: an
 * alert node that mounts already populated can be missed by assistive tech, and
 * moving focus also puts the user's attention on what failed.
 */
function SaveFailedAlert({ children }: PropsWithChildren) {
	return (
		<Alert.Root
			intent="danger"
			ref={(node) => {
				node?.focus();
			}}
			role="alert"
			tabIndex={-1}
		>
			<Alert.Icon />
			<Alert.Content>
				<Alert.Description>{children}</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	);
}

type Profile = {
	name: string;
	description: string;
};

const initialProfile: Profile = {
	name: "my-agent-endpoint",
	description: "Forwards traffic to the local dev server.",
};

/**
 * The hero Sandbar demo: a small settings form whose dirty state drives the
 * bar, with a simulated async save, a failure toggle that reports the error
 * contextually in the form, and a navigation attempt that gets blocked with
 * `shake()` while changes are pending. Renders as a full preview document.
 */
export function SandbarDemo() {
	const [saved, setSaved] = useState<Profile>(initialProfile);
	const [draft, setDraft] = useState<Profile>(initialProfile);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [failNextSave, setFailNextSave] = useState(false);
	const sandbarHandle = useRef<SandbarHandle>(null);

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
					{error != null && <SaveFailedAlert>{error}</SaveFailedAlert>}
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
						Fail the next save (reports the error in the form)
					</Label>
					<Button
						appearance="link"
						intent="neutral"
						type="button"
						onClick={() => {
							// stand-in for a router navigation guard: while dirty, the
							// navigation is blocked and the bar shakes + announces
							if (isDirty) {
								sandbarHandle.current?.shake();
							}
						}}
					>
						Continue to dashboard →
					</Button>
				</Card.Body>
			</Card.Root>

			<Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton disabled={isPending} onClick={discard}>
						Discard
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton isLoading={isPending} onClick={save}>
						{isPending ? "Saving…" : "Save changes"}
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
			<Toaster />
		</Main>
	);
}

/**
 * A Sandbar whose save always fails, showing where a failure belongs: in the
 * form, next to the field that could not be saved — while the bar stays open,
 * because the decision is still pending and the user can retry. Renders as a
 * full preview document.
 */
export function SandbarFailedSaveDemo() {
	const savedName = "my-agent-endpoint";
	const [name, setName] = useState("my-agent-endpoint-staging");
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isDirty = name !== savedName;

	const save = () => {
		setIsPending(true);
		setError(null);
		// stand-in for the real request; this demo always fails so the error row
		// is exercised on every save
		window.setTimeout(() => {
			setIsPending(false);
			setError("Something went wrong while saving. Try again.");
		}, 800);
	};

	return (
		<Main className="min-h-full p-6">
			<Card.Root className="mx-auto max-w-xl">
				<Card.Body className="space-y-4">
					{error != null && <SaveFailedAlert>{error}</SaveFailedAlert>}
					<Field.Item name="endpoint-name">
						<Field.Label>Endpoint name</Field.Label>
						<Field.Control>
							<Input onChange={(event) => setName(event.target.value)} value={name} />
						</Field.Control>
					</Field.Item>
					<p className="text-muted text-sm">Saving always fails in this demo.</p>
				</Card.Body>
			</Card.Root>

			<Sandbar.Root open={isDirty}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton
						disabled={isPending}
						onClick={() => {
							setName(savedName);
							setError(null);
						}}
					>
						Discard
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton isLoading={isPending} onClick={save}>
						{isPending ? "Saving…" : "Save changes"}
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
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
 * A non-save Sandbar: the pending decision is publishing drafts, so the bar
 * composes plain `Button`s, overrides the blocked-navigation announcement,
 * and lets `Sandbar.Message` name the panel. Renders as a full preview
 * document.
 */
export function SandbarPendingPublishDemo() {
	const [pending, setPending] = useState<Draft[]>(draftPosts);
	const sandbarHandle = useRef<SandbarHandle>(null);

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
								sandbarHandle.current?.shake({
									announcement: "Publish or discard your drafts before leaving.",
								});
							}
						}}
					>
						Continue to dashboard →
					</Button>
				</Card.Body>
			</Card.Root>

			<Sandbar.Root open={pending.length > 0} handleRef={sandbarHandle}>
				<Sandbar.Message>
					{pending.length} draft {pending.length === 1 ? "post" : "posts"} pending publish
				</Sandbar.Message>
				<Sandbar.Actions>
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
				</Sandbar.Actions>
			</Sandbar.Root>
		</Main>
	);
}

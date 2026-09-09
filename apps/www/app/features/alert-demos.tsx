import { Alert } from "@ngrok/mantle/alert";
import { Button } from "@ngrok/mantle/button";
import { Field } from "@ngrok/mantle/field";
import { Input, PasswordInput } from "@ngrok/mantle/input";
import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";

/**
 * A form-level error that mounts after a failed submit.
 *
 * `role="alert"` marks it as a live region. Focus on mount covers the
 * assistive tech that misses a live region that mounts already populated.
 * Focus also puts a sighted user's attention on what went wrong.
 */
function SignInError({ children }: PropsWithChildren) {
	const alertRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		alertRef.current?.focus();
	}, []);

	return (
		<Alert.Root intent="danger" ref={alertRef} role="alert" tabIndex={-1}>
			<Alert.Icon />
			<Alert.Content>
				<Alert.Description>{children}</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	);
}

/**
 * An alert whose dismiss button stops rendering it. When the alert leaves, the
 * button after it receives focus, so a keyboard user's next Tab continues from
 * where the alert was.
 */
export function DismissibleAlertDemo() {
	const [dismissed, setDismissed] = useState(false);

	return (
		<div className="flex w-full flex-col gap-4">
			{!dismissed && (
				<Alert.Root intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Your trial ends in 3 days</Alert.Title>
						<Alert.Description>
							Add a payment method to keep your endpoints online.
						</Alert.Description>
						<Alert.DismissIconButton onClick={() => setDismissed(true)} />
					</Alert.Content>
				</Alert.Root>
			)}
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				onClick={() => setDismissed(false)}
			>
				Show the alert again
			</Button>
		</div>
	);
}

/**
 * Sign-in form that rejects every submit, so the alert mounts after the action.
 * The `key` remounts the alert on a repeated attempt, so it announces again.
 */
export function DynamicAlertDemo() {
	const [attempts, setAttempts] = useState(0);

	return (
		<form
			className="flex w-full max-w-sm flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				setAttempts((count) => count + 1);
			}}
		>
			{attempts > 0 && <SignInError key={attempts}>Invalid email or password.</SignInError>}
			<Field.Item name="email">
				<Field.Label>Email</Field.Label>
				<Field.Control>
					<Input type="email" autoComplete="username" />
				</Field.Control>
			</Field.Item>
			<Field.Item name="password">
				<Field.Label>Password</Field.Label>
				<Field.Control>
					<PasswordInput autoComplete="current-password" />
				</Field.Control>
			</Field.Item>
			<Button type="submit" appearance="filled" intent="accent">
				Sign in
			</Button>
		</form>
	);
}

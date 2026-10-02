import { Field, PasswordInput } from "@ngrok/mantle";

export const WithField = () => (
	<Field.Item className="w-80" name="authtoken">
		<Field.Label>Authtoken</Field.Label>
		<Field.Control>
			<PasswordInput defaultValue="2abcDEFghiJKLmnoPQRstu_3vwxYZ" autoComplete="off" />
		</Field.Control>
		<Field.Description>Agents use this token to connect to your account.</Field.Description>
	</Field.Item>
);

export const Revealed = () => (
	<Field.Item className="w-80" name="api-key">
		<Field.Label>API key</Field.Label>
		<Field.Control>
			<PasswordInput defaultValue="ak_2xTq9LmZ4bR7nV1cK8" showValue autoComplete="off" />
		</Field.Control>
	</Field.Item>
);

export const Invalid = () => (
	<Field.Item className="w-80" name="new-password">
		<Field.Label>New password</Field.Label>
		<Field.Control>
			<PasswordInput defaultValue="hunter2" validation="error" autoComplete="new-password" />
		</Field.Control>
		<Field.Errors messages={["Use at least 8 characters."]} />
	</Field.Item>
);

export const Empty = () => (
	<Field.Item className="w-80" name="password">
		<Field.Label>Password</Field.Label>
		<Field.Control>
			<PasswordInput autoComplete="current-password" />
		</Field.Control>
	</Field.Item>
);

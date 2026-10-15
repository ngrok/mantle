import { Alert, Button } from "@ngrok/mantle";

export const Intents = () => (
	<div className="flex w-full max-w-xl flex-col gap-2">
		<Alert.Root intent="info">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>New regions available</Alert.Title>
				<Alert.Description>Endpoints can now run in Frankfurt and São Paulo.</Alert.Description>
			</Alert.Content>
		</Alert.Root>
		<Alert.Root intent="success">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>Domain verified</Alert.Title>
				<Alert.Description>api.example.com is ready to receive traffic.</Alert.Description>
			</Alert.Content>
		</Alert.Root>
		<Alert.Root intent="warning">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>Certificate expires in 7 days</Alert.Title>
				<Alert.Description>Renew it before May 14 to avoid TLS errors.</Alert.Description>
			</Alert.Content>
		</Alert.Root>
		<Alert.Root intent="danger">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>Payment failed</Alert.Title>
				<Alert.Description>
					Update your billing details to keep your agents online.
				</Alert.Description>
			</Alert.Content>
		</Alert.Root>
		<Alert.Root intent="important">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>Scheduled maintenance</Alert.Title>
				<Alert.Description>
					The dashboard is read-only on Sunday from 02:00 to 03:00 UTC.
				</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	</div>
);

export const Dismissible = () => (
	<div className="w-full max-w-xl">
		<Alert.Root intent="info">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>Traffic Policy is now generally available</Alert.Title>
				<Alert.DismissIconButton />
				<Alert.Description>
					Add rate limits, auth, and header rewrites to any endpoint without changing your app.
				</Alert.Description>
				<div className="mt-2">
					<Button appearance="outlined" intent="neutral" size="sm">
						Read the guide
					</Button>
				</div>
			</Alert.Content>
		</Alert.Root>
	</div>
);

export const Banner = () => (
	<div className="w-full">
		<Alert.Root intent="warning" appearance="banner">
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>You are viewing a read-only replica of this account.</Alert.Title>
			</Alert.Content>
		</Alert.Root>
	</div>
);

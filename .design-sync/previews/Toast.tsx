import { Button, IconButton, Toast, XIcon } from "@ngrok/mantle";

const DismissAction = () => (
	<Toast.Action asChild>
		<IconButton
			type="button"
			appearance="ghost"
			intent="neutral"
			size="xs"
			icon={<XIcon />}
			label="Dismiss toast"
		/>
	</Toast.Action>
);

export const Intents = () => (
	<div className="flex w-full max-w-sm flex-col gap-3">
		<Toast.Root intent="info">
			<Toast.Icon />
			<Toast.Message>A new agent version is available. Restart to upgrade.</Toast.Message>
			<DismissAction />
		</Toast.Root>
		<Toast.Root intent="success">
			<Toast.Icon />
			<Toast.Message>Traffic Policy saved to api.example.com.</Toast.Message>
			<DismissAction />
		</Toast.Root>
		<Toast.Root intent="warning">
			<Toast.Icon />
			<Toast.Message>You have used 90% of your monthly bandwidth.</Toast.Message>
			<DismissAction />
		</Toast.Root>
		<Toast.Root intent="danger">
			<Toast.Icon />
			<Toast.Message>Could not reserve app.example.com. The domain is already taken.</Toast.Message>
			<DismissAction />
		</Toast.Root>
	</div>
);

export const WithTextAction = () => (
	<div className="w-full max-w-sm">
		<Toast.Root intent="success">
			<Toast.Icon />
			<Toast.Message>API key revoked. Agents that use it disconnect within a minute.</Toast.Message>
			<Toast.Action asChild>
				<Button type="button" appearance="outlined" intent="neutral" size="xs">
					Undo
				</Button>
			</Toast.Action>
		</Toast.Root>
	</div>
);

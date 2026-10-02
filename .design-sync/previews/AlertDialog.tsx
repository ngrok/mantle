import { AlertDialog, Button } from "@ngrok/mantle";

export const DeleteEndpoint = () => (
	<AlertDialog.Root intent="danger" defaultOpen modal={false}>
		<AlertDialog.Trigger asChild>
			<Button type="button" appearance="outlined" intent="danger">
				Delete endpoint
			</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Icon />
			<AlertDialog.Body>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete api.example.ngrok.app?</AlertDialog.Title>
					<AlertDialog.Description>
						The endpoint stops accepting traffic right away. Agents that use it go offline until you
						point them at a new URL.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
					<AlertDialog.Action type="button">Delete endpoint</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Body>
		</AlertDialog.Content>
	</AlertDialog.Root>
);

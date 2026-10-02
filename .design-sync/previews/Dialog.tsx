import { Button, Dialog } from "@ngrok/mantle";

export const ConfirmDialog = () => (
	<Dialog.Root defaultOpen modal={false}>
		<Dialog.Trigger asChild>
			<Button type="button" appearance="filled" intent="neutral">
				Rotate API key
			</Button>
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Rotate API key?</Dialog.Title>
				<Dialog.CloseIconButton />
			</Dialog.Header>
			<Dialog.Body>
				The current key stops working in 24 hours. Update every agent and CI job that uses it before
				then.
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close asChild>
					<Button type="button" intent="neutral" appearance="outlined">
						Cancel
					</Button>
				</Dialog.Close>
				<Dialog.Close asChild>
					<Button type="button" intent="neutral" appearance="filled">
						Rotate key
					</Button>
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
);

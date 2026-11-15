import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Button } from "@ngrok/mantle/button";

import { TanStackFormDemo } from "~/examples/alert-dialog/alert-dialog-tanstack-form-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Alert Dialog docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<AlertDialog.Root intent="info">
				<AlertDialog.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Show Info Alert Dialog
					</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Icon />
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
							<AlertDialog.Description>
								Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
							<AlertDialog.Action type="button">Continue</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</PreviewCanvas>
	);
}

/** The "Intent" example on the Alert Dialog docs page. */
export function IntentExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-6">
			<AlertDialog.Root intent="info">
				<AlertDialog.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Show Info Alert Dialog
					</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Icon />
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
							<AlertDialog.Description>
								Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
							<AlertDialog.Action type="button">Continue</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
			<AlertDialog.Root intent="danger">
				<AlertDialog.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Show Danger Alert Dialog
					</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Icon />
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
							<AlertDialog.Description>
								Proident quis nisi tempor irure sunt ut minim occaecat mollit sunt.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
							<AlertDialog.Action type="button">Continue</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Alert Dialog docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormDemo />
		</PreviewCanvas>
	);
}

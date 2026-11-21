import { Button, IconButton } from "@ngrok/mantle/button";
import { Code } from "@ngrok/mantle/code";
import { Dialog } from "@ngrok/mantle/dialog";
import { Dialog as NativeDialog } from "@ngrok/mantle/dialog/native";
import { Sheet } from "@ngrok/mantle/sheet";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { TrashSimpleIcon } from "@phosphor-icons/react/TrashSimple";

import { FullPageDialogDemo } from "~/examples/dialog/dialog-full-page-demo";
import { TanStackFormDemo } from "~/examples/dialog/dialog-tanstack-form-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Dialog docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-6">
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open dialog
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Are you absolutely sure?</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						This action cannot be undone. This will permanently delete your account and remove your
						data from our servers.
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" intent="neutral" appearance="outlined">
								Cancel
							</Button>
						</Dialog.Close>
						<Dialog.Close asChild>
							<Button type="button" intent="danger" appearance="filled">
								Delete
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "Header with a description" example on the Dialog docs page. */
export function HeaderWithADescriptionExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-wrap gap-4">
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Decommission a runner
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Request decommission?</Dialog.Title>
						<Dialog.Description>
							<Code>runner-ecs-us-east-1-7f3a9c</Code> drains before it leaves the pool. It keeps
							its assigned replicas until it acknowledges the request, then the scheduler removes
							it.
						</Dialog.Description>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						<p>
							Queued work on this runner finishes first. New work goes to the other runners in the
							pool.
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Cancel
							</Button>
						</Dialog.Close>
						<Dialog.Close asChild>
							<Button type="button" appearance="filled" intent="danger">
								Request decommission
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Rotate a signing key
					</Button>
				</Dialog.Trigger>
				<Dialog.Content preferredWidth="max-w-3xl">
					<Dialog.Header>
						<Dialog.Title>
							Rotate the signing key for every endpoint on the staging cluster and revoke the
							current key after the next deploy?
						</Dialog.Title>
						<Dialog.Description>
							Connected clients re-authenticate on their next request.
						</Dialog.Description>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						<p>The current key stays valid for one hour after the rotation.</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Cancel
							</Button>
						</Dialog.Close>
						<Dialog.Close asChild>
							<Button type="button" appearance="filled" intent="neutral">
								Rotate key
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "Full-page dialog" example on the Dialog docs page. */
export function FullPageDialogExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<FullPageDialogDemo />
		</PreviewCanvas>
	);
}

/** The "Combining with a Tooltip" example on the Dialog docs page. */
export function CombiningWithATooltipExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Dialog.Root>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<Dialog.Trigger asChild>
							<IconButton
								type="button"
								appearance="outlined"
								intent="neutral"
								label="Delete"
								size="sm"
								icon={<TrashSimpleIcon />}
							/>
						</Dialog.Trigger>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Delete</p>
					</Tooltip.Content>
				</Tooltip.Root>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Are you absolutely sure?</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						This action cannot be undone. This will permanently delete your account and remove your
						data from our servers.
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" intent="neutral" appearance="outlined">
								Cancel
							</Button>
						</Dialog.Close>
						<Dialog.Close asChild>
							<Button type="button" intent="danger" appearance="filled">
								Delete
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "Stacking a Sheet over a Dialog" example on the Dialog docs page. */
export function StackingASheetOverADialogExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open dialog
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Dialog</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body className="space-y-4">
						<p>Open the sheet below. It stacks on top of this dialog.</p>
						<Sheet.Root>
							<Sheet.Trigger asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Open sheet
								</Button>
							</Sheet.Trigger>
							<Sheet.Content>
								<Sheet.Header>
									<Sheet.TitleGroup>
										<Sheet.Title>Sheet over a dialog</Sheet.Title>
										<Sheet.Actions>
											<Sheet.CloseIconButton />
										</Sheet.Actions>
									</Sheet.TitleGroup>
									<Sheet.Description>
										This sheet renders on top of the dialog that opened it.
									</Sheet.Description>
								</Sheet.Header>
								<Sheet.Body>
									<p>Close this sheet to return to the dialog underneath.</p>
								</Sheet.Body>
								<Sheet.Footer>
									<Sheet.Close asChild>
										<Button type="button" appearance="outlined" intent="neutral">
											Close
										</Button>
									</Sheet.Close>
								</Sheet.Footer>
							</Sheet.Content>
						</Sheet.Root>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Close
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Dialog docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormDemo />
		</PreviewCanvas>
	);
}

/** The "Native dialog" example on the Dialog docs page. */
export function NativeDialogExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-6">
			<NativeDialog.Root>
				<NativeDialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open native dialog
					</Button>
				</NativeDialog.Trigger>
				<NativeDialog.Content>
					<NativeDialog.Header>
						<NativeDialog.Title>Are you absolutely sure?</NativeDialog.Title>
						<NativeDialog.CloseIconButton />
					</NativeDialog.Header>
					<NativeDialog.Body>
						This action cannot be undone. This will permanently delete your account and remove your
						data from our servers.
					</NativeDialog.Body>
					<NativeDialog.Footer>
						<NativeDialog.Close asChild>
							<Button type="button" intent="neutral" appearance="outlined">
								Cancel
							</Button>
						</NativeDialog.Close>
						<NativeDialog.Close asChild>
							<Button type="button" intent="danger" appearance="filled">
								Delete
							</Button>
						</NativeDialog.Close>
					</NativeDialog.Footer>
				</NativeDialog.Content>
			</NativeDialog.Root>
		</PreviewCanvas>
	);
}

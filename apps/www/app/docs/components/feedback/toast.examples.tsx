import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Button, IconButton } from "@ngrok/mantle/button";
import { Dialog } from "@ngrok/mantle/dialog";
import { Sheet } from "@ngrok/mantle/sheet";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useState } from "react";
import invariant from "tiny-invariant";
import { PreviewCanvas } from "~/components/preview-canvas";

export function ToastDemo() {
	const intents = ["info", "success", "warning", "danger"] as const;
	const [intentIndex, setIntentIndex] = useState(0);
	const intent = intents[intentIndex % intents.length];
	invariant(intent, `Invalid intent index: ${intentIndex}`);
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-4">
			<Button
				type="button"
				appearance="filled"
				intent="neutral"
				onClick={() => {
					makeToast(
						<Toast.Root intent={intent}>
							<Toast.Icon />
							<Toast.Message>
								Laborum ea anim adipisicing in Lorem incididunt mollit ipsum reprehenderit.
							</Toast.Message>
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
						</Toast.Root>,
					);
					setIntentIndex((prev) => prev + 1);
				}}
			>
				Show toast
			</Button>
		</PreviewCanvas>
	);
}

export function ToastOverOverlaysDemo() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-4">
			<Sheet.Root>
				<Sheet.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open sheet
					</Button>
				</Sheet.Trigger>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.Title>Are you absolutely sure?</Sheet.Title>
					</Sheet.Header>
					<Sheet.Body className="space-y-4">
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() =>
								makeToast(
									<Toast.Root intent="warning">
										<Toast.Icon />
										<Toast.Message>
											Laborum ea anim adipisicing in Lorem incididunt mollit ipsum reprehenderit.
										</Toast.Message>
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
									</Toast.Root>,
								)
							}
						>
							Show toast
						</Button>
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
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() =>
								makeToast(
									<Toast.Root intent="danger">
										<Toast.Icon />
										<Toast.Message>
											Laborum ea anim adipisicing in Lorem incididunt mollit ipsum reprehenderit.
										</Toast.Message>
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
									</Toast.Root>,
								)
							}
						>
							Show toast
						</Button>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" intent="neutral" appearance="outlined">
								Cancel
							</Button>
						</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
			<AlertDialog.Root intent="info">
				<AlertDialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Show info alert dialog
					</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Icon />
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
						</AlertDialog.Header>
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() =>
								makeToast(
									<Toast.Root intent="success">
										<Toast.Icon />
										<Toast.Message>
											Laborum ea anim adipisicing in Lorem incididunt mollit ipsum reprehenderit.
										</Toast.Message>
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
									</Toast.Root>,
								)
							}
						>
							Show toast
						</Button>
						<AlertDialog.Footer>
							<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
						</AlertDialog.Footer>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</PreviewCanvas>
	);
}

/** The first example on the Toast docs page. */
export function OverviewExample() {
	return <ToastDemo />;
}

/** The "Over a sheet or dialog" example on the Toast docs page. */
export function OverASheetOrDialogExample() {
	return <ToastOverOverlaysDemo />;
}

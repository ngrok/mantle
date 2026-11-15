import { Button } from "@ngrok/mantle/button";
import { Combobox } from "@ngrok/mantle/combobox";
import { Dialog } from "@ngrok/mantle/dialog";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { Popover } from "@ngrok/mantle/popover";
import { Select } from "@ngrok/mantle/select";
import { Sheet } from "@ngrok/mantle/sheet";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { Tooltip } from "@ngrok/mantle/tooltip";

import { LateAnnouncementDemo } from "~/features/stacking-layers-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "A base float never paints above an overlay" example on the Stacking Layers docs page. */
export function ABaseFloatNeverPaintsAboveAnOverlayExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<LateAnnouncementDemo />
		</PreviewCanvas>
	);
}

/** The "Floats inside a dialog paint above it" example on the Stacking Layers docs page. */
export function FloatsInsideADialogPaintAboveItExample() {
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
						<Dialog.Title>Floats in a dialog</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body className="space-y-4">
						<Popover.Root>
							<Popover.Trigger asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Open popover
								</Button>
							</Popover.Trigger>
							<Popover.Content>
								<p>This popover paints above the dialog that owns it.</p>
							</Popover.Content>
						</Popover.Root>
						<Select.Root>
							<Select.Trigger className="w-45">
								<Select.Value placeholder="Open select" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="apple">Apple</Select.Item>
								<Select.Item value="banana">Banana</Select.Item>
							</Select.Content>
						</Select.Root>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Open menu
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item>Menu item</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Hover for a tooltip
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>This tooltip paints above the dialog.</Tooltip.Content>
						</Tooltip.Root>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "Pickers inside a sheet place themselves" example on the Stacking Layers docs page. */
export function PickersInsideASheetPlaceThemselvesExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Sheet.Root>
				<Sheet.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open sheet
					</Button>
				</Sheet.Trigger>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Pickers in a sheet</Sheet.Title>
							<Sheet.Actions>
								<Sheet.CloseIconButton />
							</Sheet.Actions>
						</Sheet.TitleGroup>
					</Sheet.Header>
					<Sheet.Body className="space-y-4">
						<Combobox.Root>
							<Combobox.Input placeholder="Search fruits..." />
							<Combobox.Content>
								<Combobox.Item value="Apple" />
								<Combobox.Item value="Banana" />
								<Combobox.Item value="Cherry" />
							</Combobox.Content>
						</Combobox.Root>
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select fruits..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>
					</Sheet.Body>
				</Sheet.Content>
			</Sheet.Root>
		</PreviewCanvas>
	);
}

/** The "Floats inside a float stack by mount order" example on the Stacking Layers docs page. */
export function FloatsInsideAFloatStackByMountOrderExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Popover.Root>
				<Popover.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open popover
					</Button>
				</Popover.Trigger>
				<Popover.Content className="space-y-2">
					<p>Open the select. It paints above this popover.</p>
					<Select.Root>
						<Select.Trigger className="w-45">
							<Select.Value placeholder="Open select" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="apple">Apple</Select.Item>
							<Select.Item value="banana">Banana</Select.Item>
						</Select.Content>
					</Select.Root>
				</Popover.Content>
			</Popover.Root>
		</PreviewCanvas>
	);
}

/** The "Overlays stack in mount order" example on the Stacking Layers docs page. */
export function OverlaysStackInMountOrderExample() {
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
						<Dialog.Title>First overlay</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						<Sheet.Root>
							<Sheet.Trigger asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Open a sheet over this dialog
								</Button>
							</Sheet.Trigger>
							<Sheet.Content>
								<Sheet.Header>
									<Sheet.TitleGroup>
										<Sheet.Title>Second overlay</Sheet.Title>
										<Sheet.Actions>
											<Sheet.CloseIconButton />
										</Sheet.Actions>
									</Sheet.TitleGroup>
								</Sheet.Header>
								<Sheet.Body>
									<Popover.Root>
										<Popover.Trigger asChild>
											<Button type="button" appearance="outlined" intent="neutral">
												Open a popover over the sheet
											</Button>
										</Popover.Trigger>
										<Popover.Content>
											<p>Dialog, then sheet, then this popover: each paints above the last.</p>
										</Popover.Content>
									</Popover.Root>
								</Sheet.Body>
							</Sheet.Content>
						</Sheet.Root>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

/** The "Toasts clear every tier" example on the Stacking Layers docs page. */
export function ToastsClearEveryTierExample() {
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
						<Dialog.Title>Toast from a dialog</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() => {
								makeToast(
									<Toast.Root intent="success">
										<Toast.Icon />
										<Toast.Message>This toast paints above the dialog.</Toast.Message>
									</Toast.Root>,
								);
							}}
						>
							Fire a toast
						</Button>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
		</PreviewCanvas>
	);
}

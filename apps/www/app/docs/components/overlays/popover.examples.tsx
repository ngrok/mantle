import { Anchor } from "@ngrok/mantle/anchor";
import { Button, IconButton } from "@ngrok/mantle/button";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { Input } from "@ngrok/mantle/input";
import { Popover } from "@ngrok/mantle/popover";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Popover docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<Popover.Root>
				<Popover.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open popover
					</Button>
				</Popover.Trigger>
				<Popover.Content aria-labelledby="popover-dimensions" preferredWidth="max-w-96">
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
						}}
					>
						<div className="space-y-2">
							<h4 id="popover-dimensions" className="font-medium leading-none">
								Dimensions
							</h4>
							<p className="text-sm text-gray-700">Set the dimensions for the layer.</p>
						</div>
						<div className="grid gap-2">
							<div className="grid grid-cols-3 items-center gap-4">
								<label htmlFor="popover-width">Width</label>
								<Input id="popover-width" defaultValue="100%" className="col-span-2 h-8" />
							</div>
							<div className="grid grid-cols-3 items-center gap-4">
								<label htmlFor="popover-maxWidth">Max width</label>
								<Input id="popover-maxWidth" defaultValue="300px" className="col-span-2 h-8" />
							</div>
							<div className="grid grid-cols-3 items-center gap-4">
								<label htmlFor="popover-height">Height</label>
								<Input id="popover-height" defaultValue="25px" className="col-span-2 h-8" />
							</div>
							<div className="grid grid-cols-3 items-center gap-4">
								<label htmlFor="popover-maxHeight">Max height</label>
								<Input id="popover-maxHeight" defaultValue="none" className="col-span-2 h-8" />
							</div>
						</div>
					</form>
				</Popover.Content>
			</Popover.Root>
		</PreviewCanvas>
	);
}

/** The "Presentation" example on the Popover docs page. */
export function PresentationExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<Popover.Root presentation="auto">
				<Popover.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Add reminder
					</Button>
				</Popover.Trigger>
				<Popover.Content aria-labelledby="popover-reminder" preferredWidth="max-w-80">
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
						}}
					>
						<div className="space-y-1">
							<h4 id="popover-reminder" className="font-medium leading-none">
								New reminder
							</h4>
							<p className="text-body text-sm">We notify you at the time you pick.</p>
						</div>
						<div className="grid gap-2">
							<label htmlFor="popover-reminder-text" className="text-sm">
								Remind me to
							</label>
							<Input id="popover-reminder-text" defaultValue="Send the Q3 roadmap" />
						</div>
						<div className="flex justify-end gap-2">
							<Popover.Close asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Cancel
								</Button>
							</Popover.Close>
							<Popover.Close asChild>
								<Button type="button" appearance="filled" intent="neutral">
									Save
								</Button>
							</Popover.Close>
						</div>
					</form>
				</Popover.Content>
			</Popover.Root>
		</PreviewCanvas>
	);
}

/** The "Arrow" example on the Popover docs page. */
export function ArrowExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<Popover.Root>
				<Popover.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						What moved?
					</Button>
				</Popover.Trigger>
				<Popover.Content side="right" preferredWidth="max-w-64">
					<Popover.Arrow />
					<p className="text-sm">Products moved up here.</p>
				</Popover.Content>
			</Popover.Root>
		</PreviewCanvas>
	);
}

/** The "Open on hover" example on the Popover docs page. */
export function OpenOnHoverExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<p className="flex items-center gap-1 text-sm">
				Rate limit: 120 requests per minute
				<Popover.Root>
					<Popover.Trigger asChild openOnHover>
						<IconButton
							type="button"
							appearance="ghost"
							intent="neutral"
							size="xs"
							icon={<InfoIcon />}
							label="About rate limits"
						/>
					</Popover.Trigger>
					<Popover.Content preferredWidth="max-w-64">
						<Popover.Arrow />
						<p className="text-sm">
							A request over the limit gets a 429 response.{" "}
							<Anchor href="https://ngrok.com/docs" target="_top">
								Learn more
							</Anchor>
						</p>
					</Popover.Content>
				</Popover.Root>
			</p>
		</PreviewCanvas>
	);
}

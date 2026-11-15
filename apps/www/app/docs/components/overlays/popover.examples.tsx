import { Button } from "@ngrok/mantle/button";
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
				<Popover.Content preferredWidth="max-w-96">
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
						}}
					>
						<div className="space-y-2">
							<h4 className="font-medium leading-none">Dimensions</h4>
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

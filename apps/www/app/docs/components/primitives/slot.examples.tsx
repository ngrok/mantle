import { Button } from "@ngrok/mantle/button";
import { Slot } from "@ngrok/mantle/slot";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Slot docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col gap-4">
				<Slot className="rounded bg-blue-500 px-4 py-2 text-white">
					<a href="https://ngrok.com" target="_top">
						Visit ngrok
					</a>
				</Slot>
				<Slot className="rounded bg-red-500 px-4 py-2 text-white">
					<button type="button">Click me</button>
				</Slot>
			</div>
		</PreviewCanvas>
	);
}

/** The "Usage with asChild" example on the Slot docs page. */
export function UsageWithAschildExample() {
	return (
		<PreviewCanvas>
			<div className="flex gap-4">
				<Button appearance="filled" intent="neutral" asChild>
					<a href="https://ngrok.com" target="_top">
						Visit ngrok
					</a>
				</Button>
				<Button appearance="outlined" intent="neutral" asChild>
					<a href="https://github.com/ngrok/ngrok" target="_top">
						View on GitHub
					</a>
				</Button>
			</div>
		</PreviewCanvas>
	);
}

/** The "Class name merging" example on the Slot docs page. */
export function ClassNameMergingExample() {
	return (
		<PreviewCanvas>
			<Slot className="rounded bg-blue-500 px-4 text-white">
				<div className="bg-red-500 py-2">Child bg-red-500 wins, parent px-4 and py-2 merge</div>
			</Slot>
		</PreviewCanvas>
	);
}

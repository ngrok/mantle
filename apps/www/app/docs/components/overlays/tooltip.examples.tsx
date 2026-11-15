import { Button } from "@ngrok/mantle/button";
import { Tooltip } from "@ngrok/mantle/tooltip";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Tooltip docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Hover me
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>This feature is part of your plan</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</PreviewCanvas>
	);
}

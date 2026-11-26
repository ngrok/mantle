import { Button } from "@ngrok/mantle/button";
import { Drawer } from "@ngrok/mantle/drawer";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Drawer docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<Drawer.Root>
				<Drawer.Trigger asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Filters
					</Button>
				</Drawer.Trigger>
				<Drawer.Content>
					<Drawer.Header>
						<Drawer.Title>Filters</Drawer.Title>
						<Drawer.Description>Show the endpoints that match.</Drawer.Description>
					</Drawer.Header>
					<Drawer.Body>
						<fieldset className="grid gap-2">
							<legend className="text-strong mb-2 text-sm font-medium">Status</legend>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" defaultChecked /> Online
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" /> Offline
							</label>
						</fieldset>
					</Drawer.Body>
					<Drawer.Footer>
						<Drawer.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Cancel
							</Button>
						</Drawer.Close>
						<Drawer.Close asChild>
							<Button type="button" appearance="filled" intent="neutral">
								Apply
							</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</Drawer.Content>
			</Drawer.Root>
		</PreviewCanvas>
	);
}

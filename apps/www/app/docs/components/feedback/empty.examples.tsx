import { Empty } from "@ngrok/mantle/empty";
import { Button } from "@ngrok/mantle/button";
import { GhostIcon } from "@phosphor-icons/react/Ghost";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { SmileyMeltingIcon } from "@phosphor-icons/react/SmileyMelting";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Empty docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Empty.Root>
				<Empty.Icon svg={<GhostIcon />} />
				<Empty.Title>No endpoints yet</Empty.Title>
				<Empty.Description>
					<p>Create your first endpoint to get started.</p>
				</Empty.Description>
				<Empty.Actions>
					<Button type="button" appearance="filled" intent="neutral" icon={<PlusIcon />}>
						Create endpoint
					</Button>
				</Empty.Actions>
			</Empty.Root>
		</PreviewCanvas>
	);
}

/** The "Error page" example on the Empty docs page. */
export function ErrorPageExample() {
	return (
		<PreviewCanvas>
			<Empty.Root>
				<Empty.Icon svg={<SmileyMeltingIcon />} />
				<Empty.Title>We couldn’t load your endpoints.</Empty.Title>
				<Empty.Description>
					<p>Try again in a few minutes.</p>
				</Empty.Description>
				<Empty.Actions>
					<Button type="button" appearance="outlined" intent="neutral">
						Retry
					</Button>
				</Empty.Actions>
			</Empty.Root>
		</PreviewCanvas>
	);
}

/** The "No filter results" example on the Empty docs page. */
export function NoFilterResultsExample() {
	return (
		<PreviewCanvas>
			<Empty.Root>
				<Empty.Icon svg={<MagnifyingGlassIcon />} />
				<Empty.Title>No results matched your filter.</Empty.Title>
				<Empty.Description>
					<p>
						Check your spelling. It&apos;s possible what you&apos;re looking for no longer exists.
					</p>
				</Empty.Description>
				<Empty.Actions>
					<Button type="button" appearance="outlined" intent="neutral">
						Clear filters
					</Button>
				</Empty.Actions>
			</Empty.Root>
		</PreviewCanvas>
	);
}

/** The "Minimal" example on the Empty docs page. */
export function MinimalExample() {
	return (
		<PreviewCanvas>
			<Empty.Root>
				<Empty.Icon svg={<GhostIcon />} />
				<Empty.Title>Nothing here</Empty.Title>
			</Empty.Root>
		</PreviewCanvas>
	);
}

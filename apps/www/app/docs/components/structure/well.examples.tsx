import { Well } from "@ngrok/mantle/well";
import { Empty } from "@ngrok/mantle/empty";
import { Button } from "@ngrok/mantle/button";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Well docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Well className="w-full">
				<Empty.Root>
					<Empty.Icon svg={<MagnifyingGlassIcon />} />
					<Empty.Title>No results found</Empty.Title>
					<Empty.Description>
						<p>Try adjusting your search or filters to find what you&apos;re looking for.</p>
					</Empty.Description>
					<Empty.Actions>
						<Button type="button" appearance="outlined" intent="neutral">
							Clear filters
						</Button>
					</Empty.Actions>
				</Empty.Root>
			</Well>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Well docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Well asChild className="w-full">
				<section aria-label="Search results">
					<Empty.Root>
						<Empty.Icon svg={<MagnifyingGlassIcon />} />
						<Empty.Title>No results found</Empty.Title>
						<Empty.Description>
							<p>Try adjusting your search or filters to find what you&apos;re looking for.</p>
						</Empty.Description>
						<Empty.Actions>
							<Button type="button" appearance="filled" intent="neutral" icon={<PlusIcon />}>
								Create new
							</Button>
						</Empty.Actions>
					</Empty.Root>
				</section>
			</Well>
		</PreviewCanvas>
	);
}

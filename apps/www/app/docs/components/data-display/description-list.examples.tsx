import { IconButton } from "@ngrok/mantle/button";
import { DescriptionList } from "@ngrok/mantle/description-list";
import { CopyIcon } from "@phosphor-icons/react/Copy";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Description List docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-lg">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Key</DescriptionList.Label>
						<DescriptionList.Value className="font-bold">my-api-key</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>ID</DescriptionList.Label>
						<DescriptionList.Value translate="no">
							aigk_2fKm9x8Hn3QpYT7zKlR0vW5
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Description</DescriptionList.Label>
						<DescriptionList.Value>
							Production API key for the billing service
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Created</DescriptionList.Label>
						<DescriptionList.Value>2 days ago by admin@example.com</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Last used</DescriptionList.Label>
						<DescriptionList.Value>
							<span className="italic text-muted">Never</span>
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Metadata</DescriptionList.Label>
						<DescriptionList.Value>17 Bytes</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Description List docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-lg">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Docs</DescriptionList.Label>
						<DescriptionList.Value asChild>
							<a href="https://mantle.ngrok.com" target="_top">
								mantle.ngrok.com
							</a>
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Actions in a row" example on the Description List docs page. */
export function ActionsInARowExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-lg">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Name</DescriptionList.Label>
						<DescriptionList.Value>my-api-key</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>ID</DescriptionList.Label>
						<DescriptionList.Value className="flex items-center gap-2">
							<span translate="no" className="truncate">
								aigk_2fKm9x8Hn3QpYT7zKlR0vW5
							</span>
							<IconButton
								appearance="ghost"
								intent="neutral"
								size="2xs"
								label="Copy ID"
								icon={<CopyIcon />}
							/>
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Long values" example on the Description List docs page. */
export function LongValuesExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-lg">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Request URL</DescriptionList.Label>
						<DescriptionList.Value>
							<span className="block truncate">
								https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22very-long-value%22%7D&limit=200&offset=0
							</span>
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Token</DescriptionList.Label>
						<DescriptionList.Value translate="no" className="wrap-anywhere">
							aigk_2fKm9x8Hn3QpYT7zKlR0vW5bN1cD4eF6gH8jK0lM2nP4qR6sT8uV0wX2yZ4aB6cD8eF0gH2jK4
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

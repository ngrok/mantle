import { CopyIcon } from "@phosphor-icons/react/Copy";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { DownloadIcon } from "@phosphor-icons/react/Download";
import { RocketLaunchIcon } from "@phosphor-icons/react/RocketLaunch";
import { Icon } from "@ngrok/mantle/icon";
import { SplitButton } from "@ngrok/mantle/split-button";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Split Button docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SplitButton.Root>
				<SplitButton.PrimaryAction icon={<CopyIcon />}>Copy page</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open actions menu" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>
						<Icon svg={<CopyIcon />} />
						Copy page
					</SplitButton.MenuItem>
					<SplitButton.MenuItem>
						<Icon svg={<FileTextIcon />} />
						View as Markdown
					</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</PreviewCanvas>
	);
}

/** The "Size" example on the Split Button docs page. */
export function SizeExample() {
	return (
		<PreviewCanvas className="min-h-160 items-start">
			<div className="flex flex-wrap items-start justify-center gap-6">
				<div>
					<p className="mb-2 text-center font-mono text-xs">Size xs</p>
					<SplitButton.Root size="xs">
						<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="Open create options" />
						<SplitButton.MenuContent>
							<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>
				<div>
					<p className="mb-2 text-center font-mono text-xs">Size sm</p>
					<SplitButton.Root size="sm">
						<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="Open create options" />
						<SplitButton.MenuContent>
							<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>
				<div>
					<p className="mb-2 text-center font-mono text-xs">Size md (default)</p>
					<SplitButton.Root size="md">
						<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="Open create options" />
						<SplitButton.MenuContent>
							<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>
				<div>
					<p className="mb-2 text-center font-mono text-xs">Size lg</p>
					<SplitButton.Root size="lg">
						<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="Open create options" />
						<SplitButton.MenuContent>
							<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>
				<div>
					<p className="mb-2 text-center font-mono text-xs">Size xl</p>
					<SplitButton.Root size="xl">
						<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="Open create options" />
						<SplitButton.MenuContent>
							<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Menu width" example on the Split Button docs page. */
export function MenuWidthExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SplitButton.Root>
				<SplitButton.PrimaryAction icon={<RocketLaunchIcon />}>Deploy</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open deploy options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Deploy to staging</SplitButton.MenuItem>
					<SplitButton.MenuItem>Deploy to every production region</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Split Button docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SplitButton.Root>
				<SplitButton.PrimaryAction icon={<DownloadIcon />}>Download</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open download options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>
						<Icon svg={<DownloadIcon />} />
						Download as PDF
					</SplitButton.MenuItem>
					<SplitButton.MenuItem asChild>
						<a href="https://example.com" target="_blank" rel="noopener noreferrer">
							<Icon svg={<FileTextIcon />} />
							Open in new tab
						</a>
					</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</PreviewCanvas>
	);
}

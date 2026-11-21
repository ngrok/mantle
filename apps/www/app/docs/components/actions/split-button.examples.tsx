import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr/FileText";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { DownloadIcon } from "@phosphor-icons/react/dist/ssr/Download";
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
		<PreviewCanvas className="min-h-160 flex-col items-start gap-4">
			<SplitButton.Root size="sm">
				<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open create options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
			<SplitButton.Root size="md">
				<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open create options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
			<SplitButton.Root size="lg">
				<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open create options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
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

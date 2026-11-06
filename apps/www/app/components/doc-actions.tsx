import { Icon } from "@ngrok/mantle/icon";
import { SplitButton } from "@ngrok/mantle/split-button";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { useLocation } from "react-router";

type Props = {
	/**
	 * Override the markdown URL derived from the current pathname.
	 * Useful for routes like the index where `pathname + ".md"` doesn't produce a valid URL.
	 */
	markdownPath?: string;
};

/**
 * Fetches the markdown at `url` and copies it. The page holds no markdown: the
 * fetch starts at the click. `ClipboardItem` takes the fetch as a promise, so
 * the write starts in the click's user gesture, and Safari allows it.
 */
async function copyMarkdown(url: string): Promise<void> {
	const markdown = fetch(url).then(async (response) => {
		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status}`);
		}
		return new Blob([await response.text()], { type: "text/plain" });
	});
	await navigator.clipboard.write([new ClipboardItem({ "text/plain": markdown })]);
}

export function DocActions({ markdownPath }: Props) {
	const location = useLocation();
	const markdownUrl = markdownPath ?? `${location.pathname}.md`;

	async function copyMarkdownPage() {
		try {
			await copyMarkdown(markdownUrl);
			makeToast(
				<Toast.Root intent="success">
					<Toast.Icon />
					<Toast.Message>Copied page as Markdown</Toast.Message>
				</Toast.Root>,
			);
		} catch {
			makeToast(
				<Toast.Root intent="danger">
					<Toast.Icon />
					<Toast.Message>Failed to copy markdown</Toast.Message>
				</Toast.Root>,
			);
		}
	}

	return (
		<SplitButton.Root>
			<SplitButton.PrimaryAction icon={<CopyIcon />} onClick={copyMarkdownPage}>
				Copy page
			</SplitButton.PrimaryAction>
			<SplitButton.MenuTrigger label="Open doc actions menu" />
			<SplitButton.MenuContent>
				<SplitButton.MenuItem onClick={copyMarkdownPage}>
					<Icon svg={<CopyIcon />} />
					Copy page
				</SplitButton.MenuItem>
				<SplitButton.MenuItem asChild>
					<a href={markdownUrl} target="_blank" rel="noopener">
						<Icon svg={<FileTextIcon />} />
						View as Markdown
					</a>
				</SplitButton.MenuItem>
			</SplitButton.MenuContent>
		</SplitButton.Root>
	);
}

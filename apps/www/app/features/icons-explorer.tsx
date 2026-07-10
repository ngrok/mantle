import { Code } from "@ngrok/mantle/code";
import { Button } from "@ngrok/mantle/button";
import { useCopyToClipboard } from "@ngrok/mantle/hooks";
import { Icon } from "@ngrok/mantle/icon";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { CheckIcon } from "@phosphor-icons/react/Check";
import Fuse, { type IFuseOptions } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { type IconData, iconData } from "~/features/icons/icon-data";

const fuseOptions = {
	keys: [
		{ name: "name", weight: 0.6 },
		{ name: "id", weight: 0.25 },
		{ name: "tags", weight: 0.15 },
	],
	threshold: 0.25,
} as const satisfies IFuseOptions<IconData>;

/**
 * Interactive icon explorer with search and click-to-copy.
 */
export function IconsExplorer() {
	const [query, setQuery] = useState("");
	const fuzzy = useMemo(() => new Fuse(iconData, fuseOptions), []);

	const filtered = query ? fuzzy.search(query).map((result) => result.item) : iconData;

	return (
		<div className="space-y-4 mb-4">
			<div className="space-y-1">
				<Label className="block" htmlFor="icon-search">
					Search Icons
				</Label>
				<Input
					autoComplete="off"
					id="icon-search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{filtered.length === 0 ? (
				<div className="space-y-4 text-center">
					<p className="text-strong">
						No results found for <Code>{query}</Code>
					</p>
					<Button
						type="button"
						appearance="outlined"
						priority="neutral"
						onClick={() => setQuery("")}
					>
						Clear Search
					</Button>
				</div>
			) : (
				<ul className="grid grid-cols-4 gap-2">
					{filtered.map((item) => (
						<ListItem key={item.id} item={item} />
					))}
				</ul>
			)}
		</div>
	);
}

function ListItem({ item }: { item: IconData }) {
	const copyToClipboard = useCopyToClipboard();
	const [wasCopied, setWasCopied] = useState(false);
	const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const copyText = `import { ${item.name} } from "@ngrok/mantle/icons";`;

	useEffect(() => {
		return () => {
			if (timeoutHandle.current != null) {
				clearTimeout(timeoutHandle.current);
			}
		};
	}, []);

	return (
		<li>
			<button
				type="button"
				onClick={() => {
					copyToClipboard(copyText);
					setWasCopied(true);

					if (timeoutHandle.current != null) {
						clearTimeout(timeoutHandle.current);
					}

					timeoutHandle.current = setTimeout(() => {
						setWasCopied(false);
					}, 2000);
				}}
				className="h-full border border-card-muted hover:border-card flex flex-col items-center gap-1 justify-center relative bg-card ring-accent-600 hover:bg-card-hover focus-visible:bg-card-hover group w-full cursor-pointer rounded-md px-4 py-3 focus:outline-hidden focus-visible:ring-2"
			>
				{wasCopied && (
					<div className="flex absolute right-2.5 top-2.5 z-10 rounded bg-filled-success text-on-filled hover:bg-filled-success focus:bg-filled-success focus-visible:border-success-600 focus-visible:ring-focus-success w-auto gap-1 border-transparent items-center pl-2 pr-1.5 hover:border-transparent">
						<p className="text-sm text-strong">Copied</p>
						<Icon svg={<CheckIcon weight="bold" />} className="size-4" />
					</div>
				)}
				<Icon className="size-10" svg={item.Icon} />
				<p className="text-sm text-strong font-medium">{item.name}</p>
				<div className="text-sm">{item.description}</div>
			</button>
		</li>
	);
}

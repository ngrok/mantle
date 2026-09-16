import { Icon } from "@ngrok/mantle/icon";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { XIcon } from "@phosphor-icons/react/X";

/**
 * Live variant indicator pills showing which custom Tailwind variants are active.
 */
export function TailwindVariantsPills() {
	return (
		// Every label is a Tailwind variant prefix a reader retypes, and the
		// attribute is inherited by the whole list.
		<ul translate="no" className="mt-8 flex flex-wrap gap-4 font-mono text-xs">
			<li className="pointer-coarse:border-green-600 pointer-coarse:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				pointer-coarse:{" "}
				<Icon
					className="text-success-700 pointer-coarse:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 pointer-coarse:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="pointer-fine:border-green-600 pointer-fine:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				pointer-fine:{" "}
				<Icon
					className="text-success-700 pointer-fine:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 pointer-fine:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="pointer-none:border-green-600 pointer-none:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				pointer-none:{" "}
				<Icon
					className="text-success-700 pointer-none:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 pointer-none:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="hover-hover:border-green-600 hover-hover:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				hover-hover:{" "}
				<Icon
					className="text-success-700 hover-hover:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 hover-hover:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="hover-none:border-green-600 hover-none:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				hover-none:{" "}
				<Icon
					className="text-success-700 hover-none:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 hover-none:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="dark-high-contrast:border-green-600 dark-high-contrast:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				dark-high-contrast:{" "}
				<Icon
					className="text-success-700 dark-high-contrast:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 dark-high-contrast:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
			<li className="high-contrast:border-green-600 high-contrast:bg-green-600/10 flex items-center justify-between gap-1 rounded-lg border border-red-600 bg-red-600/10 p-4">
				high-contrast:{" "}
				<Icon
					className="text-success-700 high-contrast:block hidden size-4"
					svg={<CheckIcon weight="bold" />}
				/>
				<Icon
					className="text-danger-700 high-contrast:hidden block size-4"
					svg={<XIcon weight="bold" />}
				/>
			</li>
		</ul>
	);
}

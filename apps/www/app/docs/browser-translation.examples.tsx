import { Button } from "@ngrok/mantle/button";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Buttons with an icon, or two" example on the Browser Translation docs page. */
export function ButtonsWithAnIconOrTwoExample() {
	return (
		<PreviewCanvas>
			<Button appearance="outlined" intent="neutral" icon={<PlusIcon />}>
				<span>Create endpoint</span>
				<CaretDownIcon />
			</Button>
		</PreviewCanvas>
	);
}

/** The "A label that has to shrink" example on the Browser Translation docs page. */
export function ALabelThatHasToShrinkExample() {
	return (
		<PreviewCanvas>
			<Button
				appearance="outlined"
				intent="neutral"
				className="max-w-48 min-w-0 justify-start"
				icon={<PlusIcon />}
			>
				<span className="min-w-0 flex-1 truncate text-left">
					A label far too long for the width of this button
				</span>
				<CaretDownIcon />
			</Button>
		</PreviewCanvas>
	);
}

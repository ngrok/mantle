import { Code } from "@ngrok/mantle/code";
import { Icon } from "@ngrok/mantle/icon";
import { FireIcon } from "@phosphor-icons/react/dist/ssr/Fire";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Icon docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Icon svg={<FireIcon />} />
			<Icon className="text-danger-600" svg={<FireIcon weight="fill" />} />
		</PreviewCanvas>
	);
}

/** The "Merging classNames" example on the Icon docs page. */
export function MergingClassnamesExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<div className="text-center">
				<p>
					When <Code>className</Code> is not specified:
				</p>
				<div className="flex items-center justify-center">
					<Icon svg={<FireIcon />} />
				</div>
			</div>
			<div className="text-center">
				<p>
					When <Code>className</Code> is only specified on <Code>svg</Code>:
				</p>
				<div className="flex items-center justify-center">
					<Icon svg={<FireIcon className="size-12 sm:size-16" />} />
				</div>
			</div>
			<div className="text-center">
				<p>
					When <Code>className</Code> is only specified on <Code>Icon</Code>:
				</p>
				<div className="flex items-center justify-center">
					<Icon className="size-20 sm:size-28" svg={<FireIcon />} />
				</div>
			</div>
			<div className="text-center">
				<p>
					When <Code>className</Code> is specified on both <Code>svg</Code> and <Code>Icon</Code>:
				</p>
				<div className="flex items-center justify-center">
					<Icon className="size-20 sm:size-28" svg={<FireIcon className="size-12 sm:size-16" />} />
				</div>
			</div>
		</PreviewCanvas>
	);
}

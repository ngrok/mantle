import { Code } from "@ngrok/mantle/code";
import { DescriptionList } from "@ngrok/mantle/description-list";
import { TruncatedText } from "@ngrok/mantle/truncated-text";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Truncated Text docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="w-80 max-w-full resize-x overflow-auto rounded-md border border-gray-300 p-3 font-mono text-sm">
				<TruncatedText value="https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200" />
			</div>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Truncated Text docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<div className="w-72 max-w-full">
				<TruncatedText asChild tail={12} value="ghcr.io/ngrok/ngrok-operator:0.14.0-rc.2">
					<Code />
				</TruncatedText>
			</div>
		</PreviewCanvas>
	);
}

/** The "Tail length" example on the Truncated Text docs page. */
export function TailLengthExample() {
	return (
		<PreviewCanvas>
			<div className="w-80 max-w-full">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Production</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText tail={6} value="ep_2abcdEFGhijKL123456" />
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Staging</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText tail={6} value="ep_2abcdEFGhijKL789012" />
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Preview</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText tail={6} value="ep_2abcdEFGhijKL345678" />
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Head length" example on the Truncated Text docs page. */
export function HeadLengthExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Endpoint</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText head={3} value="ep_2abcdEFGhijKL123456" />
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Member</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText head={4} value="mem_21h80N9qQuAmhSB8nlTA8KImPbQ" />
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Style the head and the tail" example on the Truncated Text docs page. */
export function StyleTheHeadAndTheTailExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<TruncatedText
					className="font-mono text-sm *:data-[slot=truncated-text-head]:text-muted *:data-[slot=truncated-text-tail]:text-body"
					head={4}
					value="mem_21h80N9qQuAmhSB8nlTA8KImPbQ"
				/>
			</div>
		</PreviewCanvas>
	);
}

/** The "Selection" example on the Truncated Text docs page. */
export function SelectionExample() {
	return (
		<PreviewCanvas>
			<div className="w-72 max-w-full font-mono text-sm">
				<TruncatedText value="https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200" />
			</div>
		</PreviewCanvas>
	);
}

/** The "Performance" example on the Truncated Text docs page. */
export function PerformanceExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Request URL</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText value="https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200" />
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Endpoint</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText tail={6} value="ep_2abcdEFGhijKL123456" />
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Tooltip" example on the Truncated Text docs page. */
export function TooltipExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-sm">
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Member</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText value="mem_21h80N9qQuAmhSB8nlTA8KImPbQ" />
						</DescriptionList.Value>
					</DescriptionList.Item>
					<DescriptionList.Item>
						<DescriptionList.Label>Request URL</DescriptionList.Label>
						<DescriptionList.Value className="font-mono text-sm">
							<TruncatedText value="https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200" />
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			</div>
		</PreviewCanvas>
	);
}

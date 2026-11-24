import { Attachment } from "@ngrok/mantle/attachment";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

const draftFiles = [
	{ id: "policy", name: "traffic-policy.yaml", size: 2_340 },
	{ id: "logs", name: "endpoint-logs-2026-11-23.json", size: 1_843_200 },
];

/** The first example on the Attachment docs page: the files of a draft, each with a remove button. */
export function OverviewExample() {
	const [files, setFiles] = useState(draftFiles);

	return (
		<PreviewCanvas>
			<Attachment.List aria-label="Attachments">
				{files.map((file) => (
					<Attachment.Root key={file.id}>
						<Attachment.Preview />
						<Attachment.Name title={file.name}>{file.name}</Attachment.Name>
						<Attachment.Size bytes={file.size} />
						<Attachment.Remove
							label={`Remove ${file.name}`}
							onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
						/>
					</Attachment.Root>
				))}
			</Attachment.List>
		</PreviewCanvas>
	);
}

/** A file the app still reads: the chip is busy, with a skeleton in place of the preview. */
export function BusyExample() {
	return (
		<PreviewCanvas>
			<Attachment.List aria-label="Attachments">
				<Attachment.Root busy>
					<Skeleton className="size-8 rounded" />
					<Attachment.Name>screenshot.png</Attachment.Name>
					<Attachment.Size bytes={482_000} />
				</Attachment.Root>
			</Attachment.List>
		</PreviewCanvas>
	);
}

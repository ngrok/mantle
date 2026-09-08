import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Dialog } from "@ngrok/mantle/dialog";
import { Field } from "@ngrok/mantle/field";
import { Switch } from "@ngrok/mantle/switch";
import { useState } from "react";

const sampleRequests = [
	{ method: "GET", path: "/api/v2/endpoints", status: 200, durationMs: 12 },
	{ method: "POST", path: "/api/v2/tunnels", status: 201, durationMs: 84 },
	{ method: "GET", path: "/api/v2/reserved_domains", status: 200, durationMs: 21 },
	{ method: "DELETE", path: "/api/v2/endpoints/ep_2f8c1a", status: 204, durationMs: 33 },
	{ method: "GET", path: "/api/v2/edges/https/edghts_1x9d", status: 502, durationMs: 1204 },
	{ method: "PATCH", path: "/api/v2/api_keys/ak_71bd", status: 200, durationMs: 47 },
];

// The sample repeats so the log overflows `Dialog.Body` at full height.
const requestLog = Array.from({ length: 7 })
	.flatMap(() => sampleRequests)
	.map((request, index) => ({ ...request, id: `req_${4200 + index}` }));

/**
 * Demonstrates a full-page `Dialog`. `appearance="full-page"` fills the
 * 16px-inset box that `Dialog.Content` positions itself in, and the body's
 * switch swaps to `"full-bleed"`, which trades that inset and the rounded
 * corners for the whole viewport.
 *
 * @example
 * <FullPageDialogDemo />
 */
export function FullPageDialogDemo() {
	const [fullBleed, setFullBleed] = useState(false);

	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Button type="button" appearance="filled" intent="neutral">
					Open full-page dialog
				</Button>
			</Dialog.Trigger>
			<Dialog.Content appearance={fullBleed ? "full-bleed" : "full-page"}>
				<Dialog.Header>
					<Dialog.Title>Request log</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Body className="p-0">
					<div className="border-dialog-muted bg-dialog sticky top-0 border-b px-6 py-3">
						<Field.Item name="fullBleed">
							<Field.Label className="flex items-center gap-2">
								<Field.Control>
									<Switch checked={fullBleed} onCheckedChange={setFullBleed} />
								</Field.Control>
								Full bleed
							</Field.Label>
						</Field.Item>
					</div>
					<div className="divide-card-muted divide-y font-mono text-sm">
						{requestLog.map((request) => (
							<div
								key={request.id}
								className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 sm:px-6"
							>
								<span className="text-muted">{request.method}</span>
								<span className="text-strong truncate">{request.path}</span>
								<Badge appearance="muted" color={request.status >= 500 ? "danger" : "success"}>
									{request.status}
								</Badge>
								<span className="text-muted text-right">{request.durationMs}ms</span>
							</div>
						))}
					</div>
				</Dialog.Body>
				<Dialog.Footer>
					<Dialog.Close asChild>
						<Button type="button" appearance="outlined" intent="neutral">
							Close
						</Button>
					</Dialog.Close>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	);
}

import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Dialog } from "@ngrok/mantle/dialog";
import { OverlayPrompt } from "@ngrok/mantle/overlay-prompt";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Overlay Prompt docs page. */
export function OverviewExample() {
	const [decided, setDecided] = useState(false);
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-6">
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open dialog
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Invite team member</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>The cookie banner stays above this dialog and takes clicks.</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
			{!decided && (
				<OverlayPrompt>
					<div className="pointer-events-none fixed inset-x-0 bottom-4 z-max flex justify-center px-4">
						<Card.Root
							role="group"
							aria-label="Cookie preferences"
							className="pointer-events-auto flex flex-row items-center gap-3 px-4 py-2 shadow-lg"
						>
							<p className="text-sm">We use cookies.</p>
							<Button
								type="button"
								appearance="filled"
								intent="neutral"
								onClick={() => setDecided(true)}
							>
								Accept all
							</Button>
						</Card.Root>
					</div>
				</OverlayPrompt>
			)}
		</PreviewCanvas>
	);
}

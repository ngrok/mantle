"use client";

import { Button } from "@ngrok/mantle/button";
import { Dialog } from "@ngrok/mantle/dialog";
import { Popover } from "@ngrok/mantle/popover";
import { useState } from "react";

/**
 * The bug shape the overlay tier exists for: an announcement popover opens on
 * its own while a full-page dialog covers its anchor. The dialog stays on top
 * no matter which layer opened last, and the announcement waits underneath.
 *
 * @example
 * ```tsx
 * <LateAnnouncementDemo />
 * ```
 */
export function LateAnnouncementDemo() {
	const [announcementOpen, setAnnouncementOpen] = useState(false);

	return (
		<div className="flex flex-wrap items-center gap-4">
			<Popover.Root open={announcementOpen} onOpenChange={setAnnouncementOpen}>
				<Popover.Anchor asChild>
					<Button
						type="button"
						appearance="outlined"
						intent="neutral"
						onClick={() => setAnnouncementOpen(true)}
					>
						Show announcement
					</Button>
				</Popover.Anchor>
				<Popover.Content
					// A click anywhere else must not dismiss the announcement — only
					// its own button does, like a real onboarding popover.
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					side="bottom"
					className="flex flex-col gap-2"
				>
					<p className="text-strong text-sm font-medium">Your account moved down here</p>
					<Popover.Close asChild>
						<Button type="button" appearance="filled" intent="neutral" size="sm">
							Got it
						</Button>
					</Popover.Close>
				</Popover.Content>
			</Popover.Root>
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open takeover
					</Button>
				</Dialog.Trigger>
				<Dialog.Content appearance="full-page">
					<Dialog.Header>
						<Dialog.Title>Takeover</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body className="space-y-4">
						<p>
							This button opens the page-level announcement popover while the dialog is on top — the
							way an onboarding popover opens on its own after hydration.
						</p>
						<Button
							type="button"
							appearance="outlined"
							intent="neutral"
							onClick={() => setAnnouncementOpen(true)}
						>
							Trigger the late announcement
						</Button>
						<p>
							The announcement stays under this dialog because it belongs to the page, not to the
							dialog. Close the dialog to find it waiting where it belongs.
						</p>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}

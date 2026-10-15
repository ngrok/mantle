import { NgrokLettermarkIcon } from "@ngrok/mantle";

export const Sizes = () => (
	<div className="text-strong flex items-end gap-6">
		<NgrokLettermarkIcon className="size-5" />
		<NgrokLettermarkIcon className="size-8" />
		<NgrokLettermarkIcon className="size-12" />
		<NgrokLettermarkIcon className="size-16" />
	</div>
);

export const Colors = () => (
	<div className="flex items-center gap-4">
		<NgrokLettermarkIcon className="text-strong size-10" />
		<NgrokLettermarkIcon className="text-muted size-10" />
		<NgrokLettermarkIcon className="text-accent-600 size-10" />
		<div className="bg-filled-neutral flex size-16 items-center justify-center rounded-lg">
			<NgrokLettermarkIcon className="text-on-filled size-10" />
		</div>
	</div>
);

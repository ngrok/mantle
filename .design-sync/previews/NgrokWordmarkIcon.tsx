import { NgrokWordmarkIcon } from "@ngrok/mantle";

export const Sizes = () => (
	<div className="text-strong flex items-end gap-6">
		<NgrokWordmarkIcon className="h-auto w-16" />
		<NgrokWordmarkIcon className="h-auto w-24" />
		<NgrokWordmarkIcon className="h-auto w-32" />
	</div>
);

export const Colors = () => (
	<div className="flex items-center gap-4">
		<NgrokWordmarkIcon className="text-strong h-auto w-24" />
		<NgrokWordmarkIcon className="text-muted h-auto w-24" />
		<div className="bg-filled-neutral flex items-center rounded-lg px-4 py-3">
			<NgrokWordmarkIcon className="text-on-filled h-auto w-24" />
		</div>
	</div>
);

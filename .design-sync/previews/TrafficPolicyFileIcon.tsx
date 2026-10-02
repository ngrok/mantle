import { TrafficPolicyFileIcon } from "@ngrok/mantle";

export const Sizes = () => (
	<div className="text-strong flex items-end gap-6">
		<TrafficPolicyFileIcon className="size-4" />
		<TrafficPolicyFileIcon className="size-6" />
		<TrafficPolicyFileIcon className="size-10" />
		<TrafficPolicyFileIcon className="size-16" />
	</div>
);

export const FileLabel = () => (
	<div className="flex flex-col gap-2">
		<div className="text-body flex items-center gap-2 text-sm">
			<TrafficPolicyFileIcon className="text-muted size-5" />
			<span className="font-mono">policy.yml</span>
		</div>
		<div className="text-body flex items-center gap-2 text-sm">
			<TrafficPolicyFileIcon className="text-accent-600 size-5" />
			<span className="font-mono">rate-limit.yml</span>
		</div>
	</div>
);

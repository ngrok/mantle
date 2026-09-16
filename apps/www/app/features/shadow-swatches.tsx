/**
 * Interactive shadow swatch grid showing all shadow elevation tokens.
 */
export function ShadowSwatches() {
	return (
		// Every child names a Tailwind class a reader retypes, so nothing here
		// should be translated.
		<div translate="no" className="text-mono mt-8 flex flex-wrap gap-8 font-mono">
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-inner">
				.shadow-inner
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-sm">
				.shadow-sm
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow">
				.shadow
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-md">
				.shadow-md
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-lg">
				.shadow-lg
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-xl">
				.shadow-xl
			</div>
			<div className="bg-card xs:size-36 flex h-36 w-full shrink-0 items-center justify-center rounded-lg shadow-2xl">
				.shadow-2xl
			</div>
		</div>
	);
}

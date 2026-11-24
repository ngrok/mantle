const units = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formats a file size in bytes for a person to read, in powers of 1024: whole
 * bytes under 1 KB, else one decimal place, dropped when it is zero.
 *
 * @example
 * ```ts
 * formatFileSize(512); // "512 B"
 * formatFileSize(1536); // "1.5 KB"
 * formatFileSize(2 * 1024 * 1024); // "2 MB"
 * ```
 */
function formatFileSize(bytes: number): string {
	let value = Math.max(0, bytes);
	let unit = 0;
	// Why the rounding in the loop: 1023.96 KB rounds to "1024 KB", which reads as "1 MB".
	while (roundSize(value, unit) >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${roundSize(value, unit)} ${units[unit]}`;
}

function roundSize(value: number, unit: number): number {
	return unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
}

export {
	//,
	formatFileSize,
};

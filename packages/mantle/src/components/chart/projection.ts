/**
 * 3D → 2D projection for the scatter chart's 3D mode.
 *
 * Points live in a normalized [-1, 1]³ cube; the camera is a yaw (around the
 * vertical y axis) plus a pitch (around the screen-space x axis), followed by
 * a weak perspective divide. Pure math — depth sorting and painting stay in
 * the engine/renderer, and nothing here touches the DOM, so the whole module
 * is unit-testable.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The 3D camera: rotation only (the chart frames the whole cube; there is no
 * dolly or pan). Angles are radians.
 */
type Camera = {
	/** Rotation around the vertical axis (drag left/right). */
	yaw: number;
	/** Rotation around the horizontal screen axis (drag up/down). */
	pitch: number;
};

/**
 * A camera's precomputed rotation coefficients, so per-point projection is
 * six multiplies — no trig in the loop.
 */
type ProjectionMatrix = {
	cosYaw: number;
	sinYaw: number;
	cosPitch: number;
	sinPitch: number;
};

/**
 * Distance from the eye to the cube center, in cube units. Large enough that
 * perspective reads as gentle depth, not a fisheye.
 */
const PERSPECTIVE_DISTANCE = 4;

/**
 * How far pitch may tip, so the cube never flips upside down mid-drag.
 */
const PITCH_LIMIT = Math.PI / 2 - 0.05;

/**
 * Precompute the rotation coefficients for a camera.
 *
 * @example
 * ```ts
 * const matrix = projectionMatrix({ yaw: 0.6, pitch: 0.4 });
 * const point = projectPoint(0.5, -0.2, 0.8, matrix);
 * ```
 */
const projectionMatrix = (camera: Camera): ProjectionMatrix => ({
	cosYaw: Math.cos(camera.yaw),
	sinYaw: Math.sin(camera.yaw),
	cosPitch: Math.cos(camera.pitch),
	sinPitch: Math.sin(camera.pitch),
});

/**
 * A projected point: view-space x/y in cube units (scale to pixels with the
 * plot radius), `depth` increasing away from the viewer (sort descending to
 * paint back-to-front), and `scale` — the perspective attenuation to apply to
 * the mark radius.
 */
type ProjectedPoint = {
	x: number;
	y: number;
	depth: number;
	scale: number;
};

/**
 * Project one normalized cube point through the camera. Yaw first (around y),
 * then pitch (around x), then weak perspective.
 *
 * @example
 * ```ts
 * const matrix = projectionMatrix({ yaw: 0, pitch: 0 });
 * projectPoint(1, 0, 0, matrix); // x ≈ 1, y = 0, depth = 0 (identity camera)
 * ```
 */
const projectPoint = (
	nx: number,
	ny: number,
	nz: number,
	matrix: ProjectionMatrix,
): ProjectedPoint => {
	// Yaw around the vertical axis.
	const rx = nx * matrix.cosYaw + nz * matrix.sinYaw;
	const rz1 = -nx * matrix.sinYaw + nz * matrix.cosYaw;
	// Pitch around the horizontal screen axis.
	const ry = ny * matrix.cosPitch - rz1 * matrix.sinPitch;
	const rz = ny * matrix.sinPitch + rz1 * matrix.cosPitch;
	// Weak perspective: points nearer the viewer (smaller depth) grow slightly.
	const scale = PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE + rz);
	return { x: rx * scale, y: ry * scale, depth: rz, scale };
};

/**
 * Clamp a dragged pitch so the cube cannot flip.
 *
 * @example
 * ```ts
 * clampPitch(10); // ≈ 1.52 (just under π/2)
 * ```
 */
const clampPitch = (pitch: number): number => Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));

/**
 * Normalize a value into the [-1, 1] cube given its domain. A degenerate
 * domain maps to the cube center.
 *
 * @example
 * ```ts
 * normalizeToCube(75, [50, 100]); // 0
 * ```
 */
const normalizeToCube = (value: number, domain: readonly [number, number]): number => {
	const span = domain[1] - domain[0];
	if (span === 0) {
		return 0;
	}
	return ((value - domain[0]) / span) * 2 - 1;
};

/**
 * The cube's 8 corners in normalized space, and the 12 edges as corner index
 * pairs — the wireframe frame the 3D scatter draws for orientation.
 */
const CUBE_CORNERS: ReadonlyArray<readonly [number, number, number]> = [
	[-1, -1, -1],
	[1, -1, -1],
	[1, 1, -1],
	[-1, 1, -1],
	[-1, -1, 1],
	[1, -1, 1],
	[1, 1, 1],
	[-1, 1, 1],
];

const CUBE_EDGES: ReadonlyArray<readonly [number, number]> = [
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 0],
	[4, 5],
	[5, 6],
	[6, 7],
	[7, 4],
	[0, 4],
	[1, 5],
	[2, 6],
	[3, 7],
];

export type {
	//,
	Camera,
	ProjectedPoint,
	ProjectionMatrix,
};
export {
	//,
	clampPitch,
	CUBE_CORNERS,
	CUBE_EDGES,
	normalizeToCube,
	projectionMatrix,
	projectPoint,
};

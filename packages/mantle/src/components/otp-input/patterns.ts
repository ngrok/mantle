/**
 * The `pattern` that accepts digits only, the same value that `input-otp`
 * exports.
 *
 * @example
 * <OtpInput.Root maxLength={6} pattern={REGEXP_ONLY_DIGITS} />
 */
const REGEXP_ONLY_DIGITS = "^\\d+$";

/**
 * The `pattern` that accepts ASCII letters only, the same value that
 * `input-otp` exports.
 *
 * @example
 * <OtpInput.Root maxLength={6} pattern={REGEXP_ONLY_CHARS} />
 */
const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$";

/**
 * The `pattern` that accepts ASCII letters and digits, the same value that
 * `input-otp` exports.
 *
 * @example
 * <OtpInput.Root maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS} />
 */
const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$";

export {
	//,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
};

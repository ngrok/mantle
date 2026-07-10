import { mantleCode } from "@ngrok/mantle/code-block";

/**
 * A reusable ngrok Traffic Policy fragment, authored once with `mantleCode("yaml")` and shared
 * across SDK examples. Interpolating `oauthPolicyFragment.code` into another `mantleCode`
 * template inlines this source at build time (the Vite plugin resolves the import), so the
 * embedded policy is highlighted line-for-line in its host language with no runtime cost.
 *
 * @example
 * import { oauthPolicyFragment } from "~/features/shared-policies";
 *
 * const javaSnippet = mantleCode("java")`var policy = """
 * ${oauthPolicyFragment.code}
 * """;`;
 */
export const oauthPolicyFragment = mantleCode("yaml")`on_http_request:
  - actions:
      - type: oauth
        config:
          provider: google`;

---
"@ngrok/mantle": patch
---

`useDebouncedCallback` accepts a callback with typed parameters, such as `(query: string) => void`. Before, TypeScript rejected every callback that did not take `unknown` arguments, including the one in the hook's own example.

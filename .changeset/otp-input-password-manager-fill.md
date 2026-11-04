---
"@ngrok/mantle": patch
---

`OtpInput.Root`: let password managers fill the one-time code again. The hidden input no longer carries the ignore attributes for 1Password, Bitwarden, Dashlane, and Proton Pass, because those attributes also stop the fill. It keeps `data-lpignore`, because LastPass does not fill one-time codes.

Add `passwordManagerIgnoreProps` to `@ngrok/mantle/input`. Spread it on an input that is not a credential, such as a search box, to keep password managers off it.

---
"@ngrok/mantle": patch
---

`OtpInput.Root`: stop password managers from taking over the OTP input. The hidden input now carries the ignore attributes for 1Password, Bitwarden, Dashlane, LastPass, and Proton Pass, so their badges and fill prompts stay off the slots. To let one fill the code, pass its attribute as `undefined`.

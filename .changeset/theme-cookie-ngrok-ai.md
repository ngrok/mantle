---
"@ngrok/mantle": patch
---

`ThemeProvider` shares the theme cookie across `ngrok.ai` and its subdomains, such as `app.ngrok.ai`. It sets `domain=.ngrok.ai` on those hosts, as it sets `domain=.ngrok.com` on `ngrok.com` hosts. A theme choice on `app.ngrok.ai` now also applies on `ngrok.ai`. One cookie cannot span `ngrok.com` and `ngrok.ai`, so each site keeps its own choice.

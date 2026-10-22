---
name: Credential-safe Git pushes
description: Preventing credential disclosure when pushing with a temporary token-backed remote URL.
---

Never display raw Git output when using a credential-bearing remote URL. Validate the URL structure without displaying its value, capture Git output privately, and report only success or safe error classifications.

**Why:** Git can treat a bare token as a repository path and echo it in an error. Redacting only HTTPS URLs does not protect against that failure mode.

**How to apply:** Use this rule whenever pushing with a secret-backed remote such as GIT_URL. Do not store the credential in Git configuration or print it in diagnostics. If a token is exposed, require revocation and replacement before retrying.

# Privacy model

Public certificates contain domain-separated issuer references and content hashes, never prompt plaintext, encrypted envelopes, keys, emails, internal user IDs, or private workspace metadata. Exact public URLs are supported; automatic certificate discovery is not.

Authorized users may view decrypted source and candidate content after workspace access succeeds. Public verification never decrypts or returns private prompt content.

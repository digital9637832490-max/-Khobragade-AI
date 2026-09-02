# Storage

Do not commit user uploads here in production.
Use a private S3-compatible bucket.

Suggested prefixes:
- users/{userId}/originals/
- users/{userId}/thumbnails/
- users/{userId}/videos/
- users/{userId}/projects/
- users/{userId}/payment-proofs/

Serve private media via short-lived signed URLs after API ownership checks.

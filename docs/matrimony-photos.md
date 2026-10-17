# Matrimony Photo Operations

New profile photos use the existing MongoDB connection, not S3 credentials or Render's temporary disk. Each photo is a separate `MatrimonyPhoto` document owned by a user. Photos and profile changes commit in one database transaction, so the deployment needs a replica set (as used by Atlas).

Inputs are bounded to five files, 5 MB each. The web client accepts supported originals up to 20 MB and resizes them before transmission. The server decodes the bytes, accepts JPEG/PNG/WebP, limits pixel count, normalizes orientation, strips metadata and stores JPEG output of at most 1 MB per photo. Originals are not retained. Profile photos remain optional.

The image route requires an application session. Owners and administrators can inspect pending photos. Other signed-in members can request only approved, referenced photos belonging to enabled accounts, subject to both directions of blocking. Responses are `private, no-store`. Do not put application tokens in image URLs or make this collection public.

Photo removals and profile deletion remove the associated database photo documents transactionally. During a verified account-deletion workflow, remove `MatrimonyPhoto` records by `owner` along with the member's profile and other personal content. Legacy S3 uploads require their existing storage cleanup procedure.

Monitor database capacity: a five-photo gallery can consume up to 5 MB. MongoDB free-tier quotas still apply; this is durable storage, not unlimited storage. Do not silently discard images or move them to temporary local disk when capacity is exhausted.

Deploy the backend before the updated web client. Older clients can submit the original multipart fields, but installed apps need a new build to render protected photo URLs and use resizing/gallery controls. Approvals from old admin screens are intentionally rejected until the screen supplies the reviewed profile version.

Verification: `npm run build`, then `node --test tests/*.test.cjs`. `matrimony-integration.test.cjs` launches an isolated local MongoDB replica set and exercises actual HTTP, Socket.IO, image encoding, transaction rollback, moderation and access checks. It does not load the deployed server or use the production database. The first run downloads the official MongoDB test binary.

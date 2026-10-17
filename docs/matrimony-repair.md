# Matrimony Repair Verification

Date: 2026-10-17

## Changed Behavior

- Optional photos no longer depend on S3. New images are normalized and stored transactionally with profile changes in the existing MongoDB database.
- The editor prepares phone photos, preserves existing selections, supports removal and retries, and keeps form contents on failure.
- Protected image URLs require an authenticated request. Pending photos are restricted to the owner and admins. Blocking and disabled accounts are enforced.
- Reviewers can inspect all submitted photos at full size and read the complete bio. Reviews are conditional on the submitted version and pending status.
- Browse/inbox queries exclude unavailable members before applying their limit.
- Chat catch-up can recover gaps larger than 200 messages. REST and socket sends share idempotent notifications; unread message bodies are not broadcast to members lacking conversation access.

## Verification

- 97 frontend tests passed, including photo preparation/resource cleanup, account switching and a real Axios multipart request with its form boundary.
- 116 backend tests passed. The integration suite uses an isolated local MongoDB replica set, actual HTTP, actual Socket.IO delivery, actual image codecs and transactions. It does not connect to the production database or mutate customer records.
- Frontend and backend production builds passed.
- A local browser fixture was prepared, but browser automation could not initialize on this machine (`os error 3`). No fresh visual/mobile-device verification is claimed. The fixture and its disposable credentials were removed afterward.

## Release Constraints

- Deploy the backend before the web client. The backend root response advertises `X-APEX-Matrimony-Storage: mongodb-v1` only in the new build.
- Existing native builds must be updated to receive the new photo UI and protected image rendering. A website deployment does not replace bundled Android assets.
- Admin approval is still required before profiles appear in matching. Payment and membership checks are not bypassed.
- Framework-wide security work is not complete: `npm audit` still reports advisories in the existing Next/PWA dependency tree and other backend dependencies. This change updates Axios to 1.20.0, Multer to 2.4.0 and the backend's proxy-addr resolution to 2.0.8; it is not a blanket security clearance or certification of every app feature.
- Database capacity and backups still require operational monitoring. The new storage is durable but subject to the existing MongoDB quota.

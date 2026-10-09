# Authentication rollout

## User flow

- Login asks only for an Indian mobile number and its Firebase SMS OTP.
- The backend verifies the Firebase signature, revocation status, phone provider and verified phone. Submitted phone, role, wallet balance and user ID cannot select an account.
- Known users receive their existing saved profile. Login never replaces their name.
- Unknown users receive `registrationRequired`, without an APEX account or application token. Only after a recently verified OTP can they submit a valid name and create an ordinary user account.
- Profile edits display the authoritative server response only after a successful save.
- The app layout still renders immediately. Protected requests wait for authentication; there is no full-screen session loader.

## Deployment order

1. Back up the production database before rollout. Do not delete, merge or recreate existing users or balances.
2. Deploy the backend branch to Render. Its build command remains `npm run build`, start command `npm start`. Startup creates the AuthSession indexes and a non-unique phone index. Existing duplicate phone accounts are held for support verification, not automatically merged.
3. Deploy main to Vercel. Both backend and frontend must finish deploying before acceptance testing. Existing version-2 JWTs are rejected; Firebase-signed users recover through session exchange. Old frontend builds cannot render the new registration-required response, so promptly update the frontend and advise already-open tabs to refresh. Installed APKs must be rebuilt separately.
4. Confirm Render reports successful Firebase Admin initialization for the same project used by Vercel. Never use a client API key as a Firebase Admin credential.
5. Test the published domain with one existing and one new consenting user. Verify a genuine SMS, name-only-after-OTP registration, persisted name after logout/login, denied admin access for ordinary accounts, and logout revocation. Do not use test phone numbers as evidence of real SMS delivery.

## Required configuration

Render: a strong `JWT_SECRET`, `MONGO_URI`, and valid `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64` for the frontend Firebase project. Existing Firebase Admin initialization supports both formats. Do not commit these values.

Vercel: `NEXT_PUBLIC_API_URL=https://apex-backend-fl0k.onrender.com/api`, the matching public Firebase app configuration (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and the remaining app identifiers). These public Firebase identifiers are not server service-account credentials.

Firebase Console: enable Phone authentication, authorize `apextc.shop` and `www.apextc.shop`, allow SMS delivery to India, and confirm the account's billing, quotas and abuse controls. Preserve reCAPTCHA. See [Firebase phone authentication](https://firebase.google.com/docs/auth/web/phone-auth).

Optional Render `ALLOWED_ORIGINS` is a comma-separated list of exact trusted HTTP/HTTPS origins for approved previews. No wildcard origins. The production shop domains and existing native WebView origins are already included. `trust proxy=1` assumes Render is the single trusted reverse-proxy hop; reassess before changing hosting topology.

## Security boundaries

- Admin Portal requests and resends first call `POST /api/user/admin-otp/eligibility`. Only one active database user with role `admin` and the matching canonical or legacy Indian phone is approved. Unknown, ordinary, disabled and ambiguous accounts cannot trigger Firebase SMS through that screen; outages fail closed. This public preflight is limited to five requests per minute per IP, returns no account details, and never creates a user or session. No new environment variables or hard-coded admin number are required.
- This is a portal-specific SMS gate, not a replacement for Firebase security. Customer phone login remains enabled. The public Firebase SDK can still request a normal customer OTP outside this portal; such a token cannot gain an admin session without the server's current-role check. Global provider-side SMS blocking requires Firebase Authentication with Identity Platform and a `beforeSmsSent` blocking function, a separate infrastructure change. See [Firebase blocking functions](https://firebase.google.com/docs/auth/extend-with-blocking-functions).

- One-hour HS256 application JWTs have a fixed issuer/audience, version 3 and a random session ID. Every HTTP request checks a non-expired session record and the current database user/role/disabled state. TTL deletion is housekeeping, not the authorization expiry check.
- Logout revokes the current APEX session and disconnects its sockets. Native device notifications are detached when their token is known; failures are reported, not silently claimed as revoked. Firebase SDK sign-out clears device sign-in. It does not revoke other devices' Firebase refresh tokens.
- Socket connections use the same validator, revalidate packets and every 30 seconds, leave admin rooms after role removal, and disconnect at JWT expiry. Expired connections refresh through authenticated HTTP before reconnecting.
- Cache entries, rendered private component state and pending HTTP responses are isolated across account changes. Stale requests cannot refresh or reuse another account's identity.
- Notification and utility records are owner-scoped. Job/course publishing, data seeding and email dispatch require a live admin role. Private job applications are excluded from public listings. Direct `/utility/pay` is retired; provider fulfillment must originate from verified payment checkout.
- Duplicate legacy identities require a support audit. There is no unsafe unique-phone migration or privilege assignment from a hard-coded phone number.
- Bearer tokens remain in browser storage for compatibility with the current cross-origin Render deployment and native client. They remain exposed to same-origin XSS. This is not a claim of bank-grade security; harden the broader app's content handling and consider a same-site backend/cookie architecture separately. SMS-only administration should be upgraded to MFA before expanding high-risk administrative functionality.
- The current in-memory IP limiter is per process. A multi-instance deployment needs a shared rate-limit store. Firebase SMS has separate provider-side abuse and quota controls.

## Production blockers and acceptance

Rotate previously exposed Firebase service-account keys, JWT secrets, database credentials and provider secrets. Delete revoked keys at the provider, not just from Render. Source changes cannot make a disclosed private credential trustworthy again.

Automated tests use isolated provider/database fixtures and do not send SMS or move real money. Local TypeScript/static-export success is not a substitute for the genuine published-domain OTP acceptance checks above. Browser visual verification and production Firebase Console configuration must be confirmed independently when browser tooling is unavailable.

## Rollback

Keep frontend/backend versions coordinated. Do not roll back to the prior unauthenticated utility/notification routes. If the new frontend must be rolled back, disable signup and retain server-side authorization until the registration-required contract is supported. Restore a database backup only after an incident assessment; never erase transactions to fix a login issue.

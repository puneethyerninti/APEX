# APEX First Google Play Release

## Release identity

- Application: APEX, package `com.apex.app`, version 1.1.0, versionCode 2.
- Target/compile Android API: 36. Minimum API: 24.
- Website: https://www.apextc.shop. Backend: https://apex-backend-fl0k.onrender.com.
- First Play release; owner reports a personal Console account with production access.
- New upload key authorized by the owner. Private files live outside Git in the current Windows user's `.codex/private/apex-play-release` directory. Never upload the private key to the repository or share passwords in messages.
- Enable Play App Signing when creating the first release. A new upload identity may prevent updating old sideloaded APKs in place.

## Changes verified in code

- Phone-only OTP sign-in and post-OTP registration retain the existing saved name. Admin eligibility is database-role gated; all protected actions still require server authorization.
- APEX Pay remains paused; its original code is retained. APEX TV links to the two supplied YouTube channels.
- Realty loads actual active database listings. Inquiries use validated, existing property IDs; search/filter controls work on real records. No fictional inventory fallback.
- Store links to the client's actual external store instead of fake local products/cart/search.
- Academy loads published courses and owned enrollments. A course cannot collect money without configured delivery access. Delivery and the payment fulfillment marker commit together. Invented progress/instructors/course pricing were removed.
- Website subscriptions use server prices and an atomic one-month entitlement. Duplicate events do not extend membership twice. Android digital purchases remain unavailable without Play Billing.
- Donations are paused until a verified campaign and beneficiary exist; no fabricated collection progress.
- Matrimony has report/block actions, bilateral server chat blocking, filtered profile/inbox access and terms acceptance before publication.
- Public privacy, terms, refund, support, deletion and community-safety pages are included. Deletion creates a real authenticated support request, not a false success message.
- Admin support/safety queue: `/admin-dashboard/support`. Reviewing a request does not automatically erase accounts or uploaded files.
- Resume type/size and form validation improved; uploaded-file metadata includes owner ID. Job applications and leads remain saved when notification delivery fails.
- Android backup disabled. Native geolocation plugin is synchronized.
- Existing `android/app/google-services.json` belongs to `rivan-123`, not `apex-5b654`. Native push is deliberately disabled by default until the correct Android configuration is supplied. Web sign-in uses the APEX Firebase project; socket updates remain enabled.

## Required before production submission

1. Obtain the client's real public support email and named deletion/safety operator. Do not invent these. A reminder is scheduled.
2. Have the operator approve the public privacy/terms/refund/safety wording and actually operate the deletion/report workflow. Set the Console child-safety contact to a monitored address.
3. Publish the backend changes before the frontend/Android release. Confirm the new public policy URLs load and the support API returns 401 when anonymous.
4. Rotate credentials previously exposed in messages/screenshots: Firebase service-account key, Razorpay secrets, Eko keys and database password. Configure new credentials privately on Render. Do not commit secrets.
5. Supply review access: owner-configured Firebase test phone/OTP and a normal review account if needed. Do not hardcode a bypass in the app or give reviewers admin access. Explain service-area and driver prerequisites.
6. Complete Data safety, financial-feature declaration, target audience/content rating, ads declaration, app-access instructions and store listing accurately. Matchmaking is adults-only; use Play's appropriate minor-access restrictions. Identify real financial partners/authorizations where required; a working Razorpay key does not prove a regulated product is approved.
7. Upload to internal testing, then complete the real-device checks below. Production access permits submission, not automatic approval or same-day availability.

## Device and live-provider smoke checks

- Real Android device: startup without a full-screen session loader; fresh login, actual OTP, registration, saved-name login, logout/relogin and expired-session handling. Verify `www.apextc.shop` is authorized in the APEX Firebase project.
- GPS consent/refusal, manual address search, actual pickup label, route quote, real enrolled-driver acceptance, trip progress, cancellation and cash settlement. Do not invent a nearby driver. Backend Mapbox routing configuration must be live.
- Approved adult matrimony profiles: form upload, admin review, two-account persisted messages, reconnect, read receipts, report receipt, blocked chat refusal. Android cannot sell digital memberships until Play Billing exists.
- Utility provider: successful bill/plan fetch and delivery reconciliation with the provider's approved production setup. A captured Razorpay payment alone is not recharge success. Test an explicitly authorized low-value transaction and its failure/refund path; do not charge clients merely to run an audit.
- External store, Anand Matrimony and both YouTube links open safely. No claim of external account/purchase synchronization.
- Deletion request appears in the admin queue; operator verifies ownership, checks balances/pending payments/trips, revokes sessions, deletes Firebase identity and personal profile/messages/notifications/uploads, and records lawful retention exceptions. Inform the requester after real processing. A queue receipt is not completed deletion.

No connected Android device or authenticated Play Console was available during this coding turn. Browser automation was unavailable. Automated tests and compilation are not substitutes for these checks.

## Build instructions

`scripts/create-upload-key.ps1` generates a private RSA upload identity and a Windows-protected credential outside Git. Do not run it again against existing signing material. Securely back up the key and arrange password recovery; the credential XML is tied to this Windows user/computer.

`scripts/build-play-store.ps1` requires actual production public configuration, explicit versioning and private signing credentials. It builds Next static assets, syncs Capacitor, creates release metadata and runs `bundleRelease lintRelease`. Never reuse stale `out` files or declare an unsigned/debug APK production-ready.

For this Windows runner, `JAVA_TOOL_OPTIONS` must provide a short existing `jdk.net.unixdomain.tmpdir`; Windows system trust can be used via `javax.net.ssl.trustStoreType=Windows-ROOT` and `javax.net.ssl.trustStore=NONE`. These are local build-environment settings, not app runtime settings; certificate verification remains enabled.

## References

- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- User-generated content: https://support.google.com/googleplay/android-developer/answer/9876937
- Child safety: https://support.google.com/googleplay/android-developer/answer/14747720
- Incidental matchmaking: https://support.google.com/googleplay/android-developer/answer/16838200
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Billing: https://support.google.com/googleplay/android-developer/answer/9858738

Status: submission candidate, not a certification that every bank, utility provider, driver and device flow works. Record build/signature/lint results and remaining gates before submitting.

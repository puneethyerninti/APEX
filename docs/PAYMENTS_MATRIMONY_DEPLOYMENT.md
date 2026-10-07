# Payments and Matrimony Deployment

## Real capabilities

- Razorpay checkout collects captured payments for wallet top-ups and APEX memberships.
- APEX wallet transfers work only between users who have signed into APEX with verified mobile OTP. Debit, credit, both ledger entries and the duplicate-transfer reference commit together in MongoDB.
- External UPI QR/ID payments open a bank/UPI app. APEX does not debit its wallet, record external payment success, or know that bank payment's outcome. Check the bank app for confirmation.
- On desktop, entering an external UPI ID and amount displays a locally generated payment QR for a phone's bank/UPI app. Receive QRs are also generated locally, without sending the receiver's phone number to a third-party QR-image server. These are not external APEX wallet payouts.
- Bank withdrawals and external wallet payouts are unavailable with the currently configured standard Razorpay product. An approved payout/regulated wallet integration is required before enabling them.
- Complete Profile opens https://anandmatrimony.co.in/. No Anand API, shared login, payment or profile synchronization has been provided. APEX membership purchases apply only to APEX profiles and messaging.

## Deployment requirements

1. Rotate the Eko, MongoDB and Razorpay secrets previously exposed in screenshots. Keep secrets only in Render, not public frontend variables or Git.
2. Deploy the backend branch to Render and the main branch to Vercel. Existing users must sign in again for the Firebase-verified server session.
3. Render needs Firebase Admin credentials, matching live Razorpay keys, and the actual configured Razorpay webhook secret. Configure the webhook at `/api/finance/razorpay/webhook` for captured and failed payments. MongoDB must support transactions (Atlas replica set).

   The backend address verified from the deployed frontend is `https://apex-backend-fl0k.onrender.com` (digit zero in `fl0k`). The complete webhook URL is `https://apex-backend-fl0k.onrender.com/api/finance/razorpay/webhook`; do not substitute the letter o.
4. Profile images need the existing AWS S3 credentials/bucket, correct image read permissions, and upload permissions. Only JPEG/PNG/WebP files up to 5 MB are accepted, at most five per request.
5. Users submit an actual APEX profile for admin review. Only approved, owner-bound profiles are listed or allowed to purchase memberships. Review is not a claim of government-ID verification.

   Purchase now opens the missing/rejected APEX profile form or displays the pending admin-review requirement. No Razorpay order is created before approval. The external Anand Complete Profile link cannot submit or approve an APEX profile, since no integration API has been supplied.
6. Audit legacy matrimony profiles and paid memberships manually before migration: older records did not reliably bind profiles to a verified owner and may have fabricated defaults. Do not bulk-enable them. New owner-bound submissions are isolated by `ownerVerified: true`.
7. Rebuild and distribute the Android app: native UPI intent support cannot arrive through Vercel alone. Test on a real Android phone with installed UPI apps. The launcher only confirms that an app opened, never that a payment succeeded.

## Acceptance checks before releasing to customers

### Location and chat update

- Cab pickup uses browser GPS with explicit permission and live Mapbox reverse geocoding. It preserves the measured coordinates, displays the resolved address and accuracy, and stops tracking when a manual pickup or booking takes over. A denied permission or failed lookup must not fabricate a pickup.
- Matrimony cards and the profile form are compact at mobile widths. Profile edits still require admin review; the UI does not bypass approval or activate a membership without a captured payment.
- Chat stores each message before confirming delivery, reuses the same reference on uncertain retries, and restores unconfirmed sends within the browser session. Authenticated private socket events refresh conversations, with a five-second HTTP polling fallback. Read receipts apply only to fetched messages; older history is paginated.
- On a real phone, grant location permission, verify the street address and map marker, then choose a manual pickup and confirm GPS tracking stops. GPS accuracy depends on the device; reverse geocoding cannot improve the underlying measurement.
- With two separately authenticated, approved APEX profiles and valid memberships, verify two-way messages, unread counts, read receipts, reconnect recovery, older history, and retry after a lost response. An expired or unapproved account must not gain chat access.
- Local isolated tests do not certify production Firebase/S3 configuration, live payment settlement, device GPS, or an actual driver booking. No test profiles, simulated GPS or fixture endpoints are deployed.

- Two verified APEX users: top up, transfer, retry the same reference, reload history, verify both balances and matching real ledger entries. Test insufficient balance and unregistered recipient.
- Scan both APEX receive QR and external UPI QR; verify destination and amount before approval. External handoff must not alter APEX balance or show APEX payment success.
- Submit/edit an APEX profile, approve it as admin, purchase each plan, verify expiry and activation from the database. Duplicate verification must not extend membership again.
- Verify chat room isolation, saved messages, refresh recovery, and inactive membership rejection.
- Simulate a dropped verification response/restart and ensure captured wallet/membership payments reconcile without charging twice. Recovery batches use backoff; manual-review records still need support attention.
- Run controlled live acceptance payments only with explicit authorization. Automated fixture tests are not certification of production provider approval, bank delivery or live settlement.

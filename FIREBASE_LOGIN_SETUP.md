# Recover Firebase Login on Render

The Render error `Failed to parse private key` means Firebase Admin did not initialize. This makes server session verification unavailable even though MongoDB and the HTTP server are running. Razorpay settings cannot repair this error.

## Replace the key safely

1. Open Firebase Console and select project `apex-5b654`, the public project ID verified in the live APEX frontend.
2. Open Project Settings > Service Accounts > Firebase Admin SDK > Generate New Private Key. Download the complete JSON file. Do not copy the web Firebase configuration or only the `private_key` field.
3. In Render > APEX-Backend > Environment, remove the old `FIREBASE_SERVICE_ACCOUNT_BASE64` value if it is malformed. Add `FIREBASE_SERVICE_ACCOUNT_JSON` and paste the complete contents of the downloaded JSON as its value. The backend supports raw JSON directly; conversion to base64 is unnecessary.
4. Set `FIREBASE_PROJECT_ID` to `apex-5b654`. Use just one credential variable. Environment credentials take precedence over any local JSON file.
5. Save and redeploy. The expected startup line is `Firebase Admin initialized successfully for project apex-5b654`.
6. Reopen APEX and verify a real phone login. Never share the JSON or private key in chat or screenshots. Revoke obsolete keys after confirming the replacement is working.

The ignored local `firebase-service-account.json` in this workspace was found to belong to `rivan-123`. It is not a replacement key for the live APEX Firebase project and must not be uploaded to Render for APEX login.

## What the hotfix changes

Valid keys with single/double escaped newlines, CRLF, flattened PEM formatting, raw JSON or base64 JSON are normalized and parsed before initialization. Incomplete, fabricated and non-RSA keys remain rejected. A configured project mismatch is rejected. Session verification continues to verify Firebase signatures and check revocation; no authentication bypass is provided.

An intentionally invalid bearer token should receive a 401 once Firebase initializes. This probe does not prove that a real account's revocation check succeeds: a real OTP login is still required for acceptance testing. Session failures now log their stage and safe error code without logging credentials or tokens.

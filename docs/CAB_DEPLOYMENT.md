# Cab-only deployment and acceptance

## Scope

Only Mini and XL cabs in Visakhapatnam are available. Bus, train and flight navigation and new ticket orders are removed. Existing ticket payments must be reviewed separately; no ticket supplier or fake tickets are provided.

## Production prerequisites

- Render deploys the backend repository's `backend` branch; Vercel deploys the root repository's `main` branch.
- Render needs `MAPBOX_API_KEY` for server routing, working `MONGO_URI` pointing to a replica set (Atlas supports transactions), `JWT_SECRET`, and `FIREBASE_SERVICE_ACCOUNT_BASE64` for the same Firebase project as the frontend.
- Online cab payment needs matching Razorpay live/test keys and a configured captured-payment webhook with a strong `RAZORPAY_WEBHOOK_SECRET`. Set the same webhook secret in Razorpay and Render, not the literal variable name.
- Vercel needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_MAPBOX_API_KEY` and the existing Firebase public configuration. Routing keys must permit their respective server/browser origins.
- Rotate the credentials exposed in prior screenshots. Never put service-account or Razorpay secrets in frontend variables.
- Backend startup waits for MongoDB and the cab reservation/quote indexes. Inspect Render startup logs before enabling bookings.
- Old phone-issued JWTs are invalidated. Users must reconnect through verified Firebase OTP sessions. Existing database roles are preserved; a phone number alone cannot grant admin/driver access.

## Driver operation

In Admin > Travel Bookings > Driver approval, select the driver's account, verify identity/licence/vehicle outside the app, choose Mini or XL, and save the real plate/make/model. The driver should sign out and back in, open Driver Mode, allow GPS, and go online.

Requests are recovered by authenticated polling. Online eligibility expires after 45 seconds without a GPS heartbeat. Drivers can accept only their approved vehicle class, one active trip at a time. Passenger status survives refresh and is also refreshed by sockets.

Pickup/destination must be selected from search results or GPS inside the server service area (83.10-83.45 longitude, 17.50-17.95 latitude). Routes and prices are server-created, expire in five minutes, and cannot be replaced by browser-submitted amounts.

## Payment and cancellation

- Cash: driver must explicitly confirm collection before completion. Cash receipt, trip completion and reservation release share one database transaction. The app does not credit the APEX wallet for cash.
- Online: collect after the completed trip. Only that trip's owner can create its Razorpay order. The price is read from the stored ride. Repeated attempts reuse the existing order.
- Captured payments are applied atomically and idempotently to the ride and ledger. The worker checks unfulfilled cab payments after restarts or missed callbacks/webhooks, in bounded batches with backoff.
- Ambiguous order creation is held for support review; do not create a replacement blindly. Find the original order in Razorpay using the ledger transaction ID as receipt, confirm its amount/owner and reconcile the record under an audited support procedure.
- Searching requests expire after five minutes. Riders/assigned drivers can cancel before starting. Cancellation is never shown as successful completion, and no money is collected before service.
- Driver settlements for online fares remain a business operation: payment collection goes to the configured Razorpay merchant, not automatically to a driver's bank. Do not advertise automatic driver payouts.

## Acceptance before live launch

1. Verify OTP login and session refresh; unauthenticated and other-account trip requests must fail.
2. Approve two real test drivers, allow GPS, select pickup/destination and inspect the server quote.
3. Double-submit one booking and race two driver acceptances. Exactly one active rider reservation and one accepted driver must remain.
4. Refresh both apps through searching, accepted, arrived and in-progress states. Verify the correct driver's live location and real plate; cancellation must remain cancellation.
5. Complete a cash trip only after collection confirmation; verify the cash ledger and released slots.
6. In Razorpay test mode, complete an online trip and verify capture, amount, order ownership and paid status. Replay the callback/webhook without duplicate application.
7. Simulate lost callbacks and backend restarts; check periodic cab payment recovery. Inject provider errors and verify that unknown results require review rather than another charge.
8. Let a search expire, deny GPS, and take a driver offline. Do not show fake acceptance, arrival or payment confirmation.

Automated checks cover policy, authorization, ledger atomicity and mocked provider behavior. They do not replace live Mapbox/Firebase/Razorpay configuration checks or real-driver field testing.

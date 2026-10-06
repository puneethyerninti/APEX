# Travel Services Audit

Historical audit before the cab-only fixes. See CAB_DEPLOYMENT.md for the replacement implementation and current acceptance requirements; the verdict and reproductions below describe the earlier code, not the repaired release.

Date: 2026-10-05

Verdict: The travel section is not ready for reliable production booking. Payment collection has checks, but travel fulfillment, identity verification, driver dispatch, pricing, and recovery have material defects.

## Scope and Evidence

Reviewed the travel page, both driver pages, location search/map components, travel routes/controllers/models, socket authentication and events, shared Razorpay order/verification/fulfillment, and admin booking history.

The audit used the current source in D:/APEX and D:/APEX/apex-backend, including existing uncommitted changes without altering them. Eleven local reproduction checks confirmed defective behavior: nine controller/model simulations and two source-contract checks. The reproduction harness is D:/APEX/.next/travel-audit.cjs and runs from the backend with `node --require tsx/cjs --test ../.next/travel-audit.cjs`.

Passing reproduction checks mean the defects were reproduced, not that the product passed acceptance testing. Database and Razorpay calls were mocked. No live payments, production database changes, provider ticket requests, or real GPS journeys were performed. Deployed commit/configuration and browser/device behavior were not verified in this review.

## Findings

### 1. [P0] Backend login can issue another user's token from a phone number

Evidence: [userController.ts](D:/APEX/apex-backend/src/controllers/userController.ts:11), [userRoutes.ts](D:/APEX/apex-backend/src/routes/userRoutes.ts:7).

The public profile endpoint looks up a supplied phone and signs a JWT for that account without validating an OTP, Firebase ID token, password, or an existing session. It also promotes hardcoded phone numbers to privileged roles. The profile-update endpoint has the same trust problem. A caller can obtain an existing driver's or administrator's identity through the backend even if the frontend normally asks for OTP. Locally reproduced token issuance with no authentication.

Fix: Verify the identity proof on the server before issuing a session. Require authenticated, self-owned profile updates. Remove phone-based automatic privilege assignment and audit previously issued privileged sessions. Adding authentication middleware to travel alone does not fix this underlying problem.

### 2. [P1] Travel APIs do not authenticate callers or enforce ownership

Evidence: [travelsRoutes.ts](D:/APEX/apex-backend/src/routes/travelsRoutes.ts:16), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:105), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:176).

Only the admin list route has authentication. Booking, active-trip reads, history reads, ride status changes, and driver availability accept supplied user/driver IDs. Status changes do not check who owns the trip, whether the caller is the assigned driver, or whether the transition is legal. Unauthenticated completion of a searching ride and reactivation of a cancelled ride were reproduced. Cross-user active-trip reads were also reproduced.

Fix: Resolve identity from a verified session, require driver roles for driver actions, enforce rider/assigned-driver ownership, validate IDs and allowed state transitions, and reject changes to terminal trips.

### 3. [P1] Bus, train, and flight payments do not fulfill real tickets

Evidence: [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:21), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:204), [TravelBooking.ts](D:/APEX/apex-backend/src/models/TravelBooking.ts:1).

After payment, fulfillment creates a local TravelBooking with status completed. There is no provider inventory search, reservation, seat/class availability, supplier booking request, ticket issuance, or provider reference/PNR in this path. The user nevertheless sees a successful booking and a promise of email/ticket delivery. Locally reproduced a completed flight booking with no provider reference.

Fix: Keep paid ticket booking unavailable until a supplier is integrated. A provider-confirmed booking, supplier reference, ticket artifact, reconciliation, and cancellation/refund contract must precede a success message. Razorpay capture confirms collection, not ticket issuance.

### 4. [P1] Prices and stored booking amounts are controlled by the client

Evidence: [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:113), [financeController.ts](D:/APEX/apex-backend/src/controllers/financeController.ts:687), [fulfillmentService.ts](D:/APEX/apex-backend/src/services/fulfillmentService.ts:119).

Cab fare, distance, duration, and route are copied from request JSON. Negative fare and an out-of-service-area route were accepted in the reproduction. Ticket order creation validates the submitted amount numerically but has no server itinerary/price validation. Fulfillment uses metadata.amount rather than the captured transaction amount. A one-rupee order carrying a 1500-rupee booking amount was accepted locally. The front end also uses a fixed 1500 fare for every bus/train/flight submission.

Fix: Persist an expiring server quote for a specific itinerary, endpoints, vehicle, and user. Create payment orders from that quote and use the authoritative transaction amount during fulfillment. Validate the service area on the backend. Share one fare policy; the backend calculation currently includes duration charges that the frontend calculation omits.

### 5. [P1] Cab completion does not establish that the fare was paid

Evidence: [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:170), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:428), [Ride.ts](D:/APEX/apex-backend/src/models/Ride.ts:25).

The current cab path explicitly skips upfront Razorpay. Completion updates only ride.status. Ride has no payment method, payment status, collection record, or payment transaction reference. The UI displays Amount paid regardless. Cash may be a valid intended method, but even cash collection is not recorded or reconciled.

Fix: Define cash/online policy explicitly. Keep trip status separate from payment status and record verified online capture or acknowledged cash collection. Generate a receipt only from those records.

### 6. [P1] The main driver dashboard never persists acceptance or trip progress

Evidence: [driver-dashboard/page.tsx](D:/APEX/src/app/driver-dashboard/page.tsx:86), [server.ts](D:/APEX/apex-backend/src/server.ts:124).

The dashboard linked from the home/account UI emits accept_ride and update_ride_status, but no backend listeners implement those commands. It changes local UI immediately. It expects rideId/riderId/origin/destination while the backend broadcasts a Ride document with _id/userId/pickup/dropoff. GPS messages consequently use missing identity fields, and the dashboard cannot complete a server-backed trip.

Fix: Select one driver implementation and one request/response contract. Use authenticated API mutations with acknowledgments. Update the screen only after the backend confirms the transition, and stream GPS using the persisted ride ID.

### 7. [P1] Rider status updates use a different event name from the backend

Evidence: [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:202), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:69).

The status endpoint emits ride_status_update, while the travel page subscribes only to ride_update_<id>. That per-ride event is used for GPS payloads without a status. A properly accepted trip therefore remains Finding Driver on the rider's screen. The page also maps cancellation to Ride Completed, which would become a false success once events are connected.

Fix: Define and test a shared status event, filter by ride ID, fetch the authoritative state on reconnect, and display cancellation separately from completion.

### 8. [P1] Driver room membership and GPS forwarding lack authorization

Evidence: [server.ts](D:/APEX/apex-backend/src/server.ts:126), [socketManager.ts](D:/APEX/apex-backend/src/utils/socketManager.ts:56).

Every authenticated socket can emit driver_online and join the room containing ride requests; the handler does not check a driver role or online eligibility. GPS forwarding trusts client-supplied riderId and rideId without checking the sender is assigned to that ride. Going offline never leaves the driver room, and disconnect does not update persisted availability. This exposes trip requests and allows spoofed live locations.

Fix: Check role and availability server-side, derive the recipient from the assigned trip, validate coordinates, and synchronize online/offline/reconnect/disconnect state. Limit dispatch to eligible nearby drivers of the requested vehicle class.

### 9. [P1] Concurrent booking and acceptance requests are not atomic

Evidence: [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:124), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:181), [Ride.ts](D:/APEX/apex-backend/src/models/Ride.ts:25).

Booking performs findOne followed by create, without a unique active-rider constraint or request idempotency. Acceptance reads searching and then saves; two drivers can both read searching before saving. The controller also never checks whether the driver already has another active trip. Both the duplicate-booking and double-acceptance races were reproduced with concurrent controller calls. These tests simulate overlapping database reads; they are not a live MongoDB concurrency test.

Fix: Use an atomic conditional transition for acceptance, transactional driver/rider reservations, an active-trip uniqueness invariant, and client request idempotency. Store driver eligibility and vehicle class in the reservation.

### 10. [P1] Active trips have no rider refresh or reconnect recovery

Evidence: [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:34), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:156).

The rider keeps its active ride ID only in component state and never calls the active-trip endpoint on load. Refresh clears the UI while the backend still blocks new bookings as an active ride. There is no polling fallback or resynchronization after missed socket events.

Fix: Restore the active trip on load and reconnect, fetch authoritative status after mutations, and poll when the socket is unavailable. Persist no client-only truth about completion or assignment.

### 11. [P1] Shared payment fulfillment can remain locked after a crash

Evidence: [fulfillmentService.ts](D:/APEX/apex-backend/src/services/fulfillmentService.ts:29), [fulfillmentService.ts](D:/APEX/apex-backend/src/services/fulfillmentService.ts:138).

The earlier payment fix claims fulfillment by setting metadata.fulfillmentInProgress before doing the work. There is no lease expiry or recovery worker. If the process stops before the final marker is written, future attempts see an occupied claim indefinitely. If a booking is created but its transaction marker is not persisted, recovery cannot identify it by a unique payment/order reference: TravelBooking stores neither.

Fix: Add durable fulfillment jobs, an expired-claim recovery policy, and an order-to-booking uniqueness key. Reconcile existing provider/local results before retrying. Do not blindly repeat a supplier booking or refund an ambiguous result.

### 12. [P2] Pickup changes and free-text edits leave stale coordinates and fares

Evidence: [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:112), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:140), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:345), [MapboxSearch.tsx](D:/APEX/src/components/MapboxSearch.tsx:77).

Use-current-location sets the address and userLocation but not pickupCoords, which booking requires. Selecting a new pickup does not recalculate an already selected destination. Editing either text input does not clear its previously selected coordinates. Route failure leaves the default/stale fare bookable, and asynchronous route/search results are not cancelled or tied to the current endpoints.

Fix: Invalidate selected coordinates and quotes on edits, set canonical pickup coordinates for GPS selection, recompute for either endpoint, discard stale responses, and prevent booking until a fresh server quote exists.

### 13. [P2] Mini/XL selection and service-area rules do not reach dispatch

Evidence: [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:186), [Ride.ts](D:/APEX/apex-backend/src/models/Ride.ts:25), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:146).

The booking body does not include the selected vehicle class, and Ride has no field for it. Every request is broadcast to the same room with no distance, capacity, online-state, or existing-trip filter. Frontend geofencing differs from autocomplete bounds and is not enforced server-side.

Fix: Persist vehicle class and a single backend service-area policy. Match only eligible available drivers with the required vehicle capacity and fresh location.

### 14. [P2] Admin and user travel history omit current cab bookings

Evidence: [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:44), [travelsController.ts](D:/APEX/apex-backend/src/controllers/travelsController.ts:57), [admin-dashboard/page.tsx](D:/APEX/src/app/admin-dashboard/page.tsx:81).

Both history endpoints query TravelBooking only, while cab requests create Ride. Admin cannot see or operate the actual cab trips from the travel list, and the rider history icon has no handler. No common view links rides, payments, driver assignment, and refunds.

Fix: Provide authenticated rider/driver/admin trip history with canonical IDs, payment references, pagination, and operational actions.

### 15. [P2] Cancellation, driver-search expiry, and refund workflows are absent

Evidence: [travelsRoutes.ts](D:/APEX/apex-backend/src/routes/travelsRoutes.ts:19), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:401), [Ride.ts](D:/APEX/apex-backend/src/models/Ride.ts:42).

The rider has no cancellation control. A searching ride has no expiration/timeout or no-driver outcome and remains an active booking indefinitely. There is no travel cancellation policy, provider cancellation endpoint, fee calculation, payment refund linkage, or driver re-dispatch flow. Generic refunds cover fulfillment exceptions, not customer cancellations or later supplier failures.

Fix: Define searching expiry, rider/driver cancellation rules, supplier reconciliation, and explicit refund-pending/refunded/manual-review states with support tooling.

### 16. [P2] The alternate driver portal has authentication and hook-order defects

Evidence: [driver/page.tsx](D:/APEX/src/app/driver/page.tsx:23), [driver/page.tsx](D:/APEX/src/app/driver/page.tsx:32), [AuthContext.tsx](D:/APEX/src/context/AuthContext.tsx:44).

It reads a token cookie, while login writes apex_token to localStorage. Its socket can therefore fail to initialize for normal authenticated sessions. It declares effects after conditional returns based on hydrated user/role; changing that state changes the hook order. This portal also has no location watcher streaming GPS. Keeping two incompatible driver UIs compounds operational failures.

Fix: Consolidate driver UX, reuse the authenticated SocketContext, keep hooks unconditional, restore online/active-trip state, and add lifecycle-managed location tracking.

### 17. [P2] Ticket form inputs, dates, scheduling, and confirmation actions are not implemented

Evidence: [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:211), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:285), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:369), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:451), [travels/page.tsx](D:/APEX/src/app/travels/page.tsx:573).

Bus/train/flight fields are uncontrolled and not read on submit. Booking uses the cab location state or generic fallback labels, and ignores the journey date. The models contain no passenger, journey-date, seat/class, or ticket fields. Schedule is a decorative control; View Ticket only closes the modal; no booking email is issued by travel fulfillment. Driver plates and pickup arrival estimates shown in cab cards are hardcoded or use the trip duration rather than driver arrival data.

Fix: Wire real itinerary/passenger fields into provider search and reservation, validate dates, implement only supported scheduling, and render actual driver/ticket/receipt data. Remove promises and controls whose operation does not exist.

## Repair Order

1. Close the backend identity bypass and enforce travel/socket ownership before live use.
2. Stop accepting paid bus/train/flight orders until a real ticket provider can fulfill them.
3. Consolidate cab booking and driver operations around one Ride contract and legal state machine.
4. Add server quotes, vehicle/service-area validation, atomic reservations, and payment records.
5. Implement rider/driver restoration, GPS authorization, polling, search expiry, and cancellation.
6. Add durable fulfillment/reconciliation and a unified admin trip/payment/refund view.
7. Implement supplier ticket search/booking/cancellation and real receipts/tickets once integrations are available.

## Required Acceptance Checks

- Login proof is verified server-side; unauthenticated/cross-user trip mutations and reads are rejected.
- Fare/vehicle/endpoints cannot be changed after a quote is accepted; stale quotes cannot be paid.
- Concurrent bookings reserve one active trip; concurrent acceptance reserves one driver.
- Driver assignment and every trip transition appear on both clients and survive refresh/reconnect.
- Offline/ineligible drivers do not receive requests; unassigned users cannot forward GPS.
- Cash and online payments have separate verified records; cancellation never displays successful payment.
- No-driver expiry, cancellations, supplier timeouts, crashes, refunds, and manual review are recoverable.
- Every ticket success includes supplier-confirmed inventory and a retrievable ticket/reference.
- Admin history contains current cab trips, payments, and operational recovery actions.

## Review Outcome

This turn produced an audit report and local reproduction harness only. No application code was changed, committed, pushed, or deployed. The existing payment regression suite does not establish any of the travel acceptance properties above.

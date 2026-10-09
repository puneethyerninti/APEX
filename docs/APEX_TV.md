# Temporary APEX Pay Replacement

APEX TV is available at `/apex-tv` and links to
`https://www.youtube.com/@Apexstore007`.

`src/config/apexPay.ts` sets `APEX_PAY_ENABLED` to `false`. The navigation
replaces Payments with APEX TV and hides Scan. Old `/payment` links, including
`/payment?scan=true`, render APEX TV without mounting the payment component,
opening the camera, launching a UPI app, or fetching wallet/history data.
These two advertisement routes are public. Other routes retain their sign-in
requirements; `/payment` becomes protected again when the switch is restored.

All payment UI, services, backend routes, stored balances, receipts and native
UPI code are retained. Utility and other merchant checkout flows are unchanged.
Existing balance enquiries can still be handled by support through the stored
records; do not delete or reset balances while APEX Pay is paused.

To restore the navigation and payment screen later, change `APEX_PAY_ENABLED`
to `true`, test and rebuild. This does not enable paused backend wallet transfers
or supply bank-transfer approvals. Restore those only after provider approval
and end-to-end verification. APEX TV remains independently accessible.

Deploy the frontend on Vercel. Bundled Android releases need a separate rebuild
and release to receive this change; an older installed APK is not updated by
Vercel. No new environment variables or YouTube API credentials are required.

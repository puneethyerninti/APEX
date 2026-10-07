# APEX first Google Play release

The web/backend payment fix is separate from a Google Play release. This repository is not yet certified ready for production Play distribution. No signed bundle, store submission, real-phone payment, or Play Billing integration has been completed by these changes.

## First-release signing

Since APEX has never been uploaded to Play Console, the developer account owner can create a new private upload key in Android Studio's Generate Signed Bundle workflow and enroll in Play App Signing. Keep a protected backup outside Git. Never send the keystore or its passwords in chat.

If existing sideloaded APKs use another signing key, a first Play release with a new app-signing key will not be an in-place update for those installations. Recover the original app-signing key if preserving that update path is necessary. Do not tell users to uninstall until their account and outstanding funds are reconciled.

## Build path

1. Install root project dependencies with `npm ci`, JDK 21, and the Android SDK/platform/build tools required by `android/variables.gradle` and Gradle. Do not build from the unrelated nested `apex-app` project.
2. Set the public production Firebase, Mapbox, API and socket variables in the build process. The script lists missing variable names without printing values. These must be the intended deployed APEX configuration, not test fixtures. Private Firebase Admin, database, Razorpay and Eko secrets belong only in Render.
3. Set `APEX_STORE_PASSWORD` and `APEX_KEY_PASSWORD` privately in the local build process; do not commit passwords or put them in command-line arguments. Use Android Studio or an approved secret manager to provide them.
4. Run from the root project, using the actual upload-keystore path and alias:

   ```powershell
   .\scripts\build-play-store.ps1 -VersionCode 2 -VersionName 1.1.0 -KeyStorePath 'C:\PRIVATE\apex-upload.jks' -KeyAlias apex-upload
   ```

   Version 2 is an example for a first Play release; use an explicit version appropriate to the release. The script rebuilds static production assets, enables `NEXT_PUBLIC_DISTRIBUTION=google-play`, syncs the root native project, and runs `bundleRelease` plus `lintRelease`. Gradle rejects a release without signing configuration and matching web release metadata.
5. The output is `android/app/build/outputs/bundle/release/app-release.aab`. Upload it to internal testing first. Verify sign-in, profile uploads, messaging, GPS, cab booking and actual authorized UPI handoffs from the Play-installed build before requesting production distribution.

## Billing and policy blockers

- Web purchases still use Razorpay. The native/Play build blocks new paid matrimony memberships, APEX digital subscriptions and digital course checkout until Play Billing or an eligible, enrolled alternative-billing program is actually integrated. It must not steer users to a web checkout as a workaround. Existing valid memberships, profile editing and chat authorization are unchanged.
- Utility bills, physical cab rides and peer-to-peer UPI payments are different from digital subscriptions. Keep each actual money flow and provider approval accurate. Opening a UPI app is not bank linking or verified payment success.
- Complete the Financial features declaration accurately. This application must not claim to operate an approved wallet, bank, or PhonePe-style UPI participant merely because it can open another UPI app.
- Complete Privacy Policy, Data Safety, account-deletion requirements, content rating, app access for reviewers, screenshots and developer/business verification. Confirm real deletion flows and retention obligations before submitting; a document or disabled button is not a working account-deletion feature.
- Check the current target-SDK, native-library/device compatibility and testing requirements in Play Console. Real device testing and store review remain release gates, not an automatic consequence of a passing web build.

## Official references

- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271)

The billing classification above is a conservative engineering gate based on these policies, not a guarantee of Google Play approval or legal compliance.

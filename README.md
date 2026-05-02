# Are You Safe?

A daily safety check-in app for the Indian audience.

The user opens the app and presses "I am safe" once a day. If they stop checking in for a configurable number of days (default: 2), the backend automatically alerts their pre-configured emergency contacts via SMS and email so someone knows to follow up.

Useful for elderly people living alone, anyone with a medical condition, solo travellers, and anyone who wants a simple dead-man's-switch style safety net.

## Status

This is an archived snapshot of the project. The AWS backend has been torn down, so the app will not run end-to-end against a live server without redeploying the Lambda functions yourself. The mobile and backend source remain here as a reference implementation.

## How it works

```
+----------------+         +-----------------+         +----------------+
|  React Native  |  HTTPS  |  API Gateway    |         |  Lambda        |
|  Mobile App    | <-----> |  (REST API)     | <-----> |  Functions     |
+----------------+         +-----------------+         +-------+--------+
        |                                                      |
        v                                              +-------+--------+
+----------------+                                     |  DynamoDB      |
| Google Sign-In |                                     |  (5 tables)    |
| (OAuth 2.0)    |                                     +-------+--------+
+----------------+                                             |
                                                       +-------+--------+
                                                       |  SNS (SMS)     |
                                                       |  SES (Email)   |
                                                       |  EventBridge   |
                                                       +----------------+
```

End-to-end flow:

1. User signs in with Google.
2. App sends the Google ID token to `POST /auth/google`. Backend verifies it, creates or updates the user in DynamoDB, returns a JWT access token + refresh token.
3. App stores the JWT in AsyncStorage. All subsequent calls send `Authorization: Bearer <token>`.
4. User presses "I am safe" -> `POST /checkin` -> backend records the date in DynamoDB.
5. An EventBridge cron triggers the `ays-monitor` Lambda every hour. It scans all users; for anyone past their configured threshold, it invokes `ays-sendAlert` once per emergency contact.
6. `ays-sendAlert` sends SMS via SNS and email via SES.

## Tech stack

**Mobile (React Native 0.83 / TypeScript)**
- React 19, React Navigation v7 (native stack + bottom tabs)
- Google Sign-In via `@react-native-google-signin/google-signin`
- Local notifications via `@notifee/react-native` with an "I am safe" action button on the daily reminder so the user can check in without opening the app
- `axios` for API calls, `@react-native-async-storage/async-storage` for token + offline state
- `react-native-config` for environment-specific API endpoints
- An offline queue that retries check-ins when connectivity returns

**Backend (AWS serverless, Node.js 20.x)**
- API Gateway (REST) -> Lambda for every endpoint
- DynamoDB for users, sessions, contacts, check-ins, alert history
- SNS for SMS, SES for email
- EventBridge for the hourly monitor
- `google-auth-library` server-side token verification, `jsonwebtoken` for app sessions

**Android native (Kotlin)**
- A home-screen widget with a single "I am safe" button so the user can check in directly from their launcher

## Repository layout

```
.
+-- src/                  React Native source (screens, services, navigation, context)
+-- android/              Android native project + Kotlin widget
+-- ios/                  iOS Xcode project
+-- backend/              AWS Lambda handlers, deploy scripts
+-- legal-pages/          Static privacy + terms pages (Firebase Hosting)
+-- App.tsx               App root
+-- index.js              RN entry + background notification handler
```

## Running the mobile app locally

Prerequisites: Node 20+, JDK 17, Android Studio (for the Android build), Xcode (for the iOS build).

```sh
npm install
```

Set up a `.env` (and `.env.development` / `.env.staging` / `.env.production` as you need them):

```
API_BASE_URL=...
GOOGLE_WEB_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
ENVIRONMENT=development
AWS_REGION=ap-south-1
```

Then:

```sh
npm start                              # Metro
npm run android                        # Android
# iOS: bundle install && bundle exec pod install (in ios/), then:
npm run ios
```

Without the AWS backend running, sign-in and check-in API calls will fail. The local UI flow still works for inspection.

## Deploying the backend

`backend/` contains the Lambda handlers and a deploy script that packages each function and pushes it to AWS. You will need:

- An AWS account with Lambda, API Gateway, DynamoDB, SNS, SES, and EventBridge access
- A Google OAuth client (Web + Android)
- An SES sender identity verified in your region
- DynamoDB tables: `ays-users`, `ays-sessions`, `ays-contacts`, `ays-checkins`, `ays-alerts`

The deploy scripts assume `ap-south-1` (Mumbai); the region is configurable via env.

## License

MIT.

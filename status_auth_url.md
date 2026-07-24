Fix Applied
Changed both .env.local files (root + apps/web/):
-BETTER_AUTH_URL=https://stillwater.jesspete.shop
+BETTER_AUTH_URL=http://localhost:3000

-NEXT_PUBLIC_APP_URL=https://stillwater.jesspete.shop
+NEXT_PUBLIC_APP_URL=http://localhost:3000
Why This Fixes It
The OAuth callback flow was broken by a domain mismatch:
Component	Was	Now
Server baseURL (config.ts:110)	https://stillwater.jesspete.shop	http://localhost:3000
Client baseURL (client.ts:34)	https://stillwater.jesspete.shop	http://localhost:3000
OAuth redirectURI	https://stillwater.jesspete.shop/api/auth/callback/google	http://localhost:3000/api/auth/callback/google
Before: the browser sent the sign-in POST to the production server, which generated state and redirected to Google. Google's callback went to production, but the state cookie was either unreachable or mismatched. After: everything flows through localhost:3000.
Required: Google Cloud Console Update
You must add http://localhost:3000/api/auth/callback/google to the Authorized redirect URIs in your Google Cloud Console OAuth2.0 client:
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add http://localhost:3000/api/auth/callback/google to "Authorized redirect URIs"
4. Save
Also ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local are real values (not placeholders).
After making these changes, restart pnpm start and retry Google sign-in.

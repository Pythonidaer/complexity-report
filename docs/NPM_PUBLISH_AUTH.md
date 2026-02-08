# npm Publish – Auth Fix

You're seeing:

1. **"Access token expired or revoked"** – need to log in again  
2. **"Two-factor authentication or granular access token with bypass 2fa enabled is required"** – npm now requires 2FA or a special token to publish

## Fix

### 1. Log in again

```bash
npm login
```

Use your npm username, password, and email. If you use 2FA, enter the one-time code when prompted.

### 2. Satisfy npm’s publish requirement (pick one)

#### Option A: Enable 2FA on npm (recommended)

1. Go to **https://www.npmjs.com** and sign in.
2. Click your profile (top right) → **Account settings**.
3. Open **"Two-Factor Authentication"**.
4. Turn on 2FA (auth app or SMS).
5. Run `npm login` again. When you publish, npm will ask for your 2FA code.

#### Option B: Use a granular access token (bypass 2FA)

1. On npmjs.com: **Profile** → **Access Tokens** → **Generate New Token**.
2. Choose **"Granular Access Token"**.
3. Name it (e.g. `publish-complexity-report`).
4. Under **Packages and scopes**, choose **"Read and write"** for the scope you publish to (e.g. `@pythonidaer`).
5. Under **Organizations** (if any), no special permission needed for your own user packages.
6. Create the token and copy it.
7. In terminal:

   ```bash
   npm logout
   npm login
   ```

   When prompted for **Password**, paste the **token** (not your account password).  
   Username and email: your normal npm username and email.

Then publish again:

```bash
npm publish --access public
```

If 2FA is enabled, npm will prompt for the one-time code during `npm publish`.

## Summary

| Step | Action |
|------|--------|
| 1 | `npm login` (refresh auth) |
| 2 | Enable 2FA at npmjs.com **or** create a granular publish token |
| 3 | `npm publish --access public` |

Once auth and 2FA/token are set up, the same command will work for future publishes.

# Publishing @pythonidaer/complexity-report to npm

Exact steps so `npm install @pythonidaer/complexity-report` works for everyone.

## Prerequisites

- You must have publish access to the **@pythonidaer** scope on npm.
- If the scope is an **organization**, your npm user must be a member with publish rights.
- If the scope is your **username**, your npm username must be `pythonidaer`.

## Steps

### 1. Log in to npm

```bash
npm login
```

Use your npm username, password, and email. If you use 2FA, complete the prompt.

### 2. Verify you're the right user

```bash
npm whoami
```

You should see the user that has access to **@pythonidaer** (e.g. `pythonidaer` or the org owner).

### 3. Publish (first time or after changes)

From the repo root:

```bash
npm publish --access public
```

- **First publish of a scoped package:** `--access public` is required so the package is installable by anyone.
- **Later publishes:** `publishConfig.access` in `package.json` is set to `"public"`, so you can run `npm publish` without the flag if you prefer; `npm publish --access public` is still safe.

### 4. Verify the package is reachable

```bash
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@pythonidaer/complexity-report
```

Expected output: **200**. Any other code (e.g. 404) means the package is not (yet) public at that URL.

### 5. Test install from another project

```bash
cd /tmp
mkdir test-install && cd test-install
npm init -y
npm install @pythonidaer/complexity-report
npx complexity-report --help
```

If install succeeds and the CLI runs, the package is correctly published and public.

## If others get 404 when installing

1. **Confirm the package is public**  
   Run the `curl` command above; it must return **200**.

2. **Confirm package name**  
   Install must use the scoped name:  
   `npm install @pythonidaer/complexity-report`  
   (not `complexity-report`).

3. **Registry**  
   Default registry must be npm:  
   `npm config get registry`  
   should be `https://registry.npmjs.org/`.

4. **Cache**  
   Have them try:  
   `npm cache clean --force`  
   then run the install again.

5. **Re-publish if needed**  
   If the package was ever published without `--access public` and without `publishConfig.access`, publish again with `npm publish --access public` (after bumping version if the version already exists).

## package.json requirement

`package.json` must include so the scoped package is public:

```json
"publishConfig": {
  "access": "public"
}
```

This is already set in this repo.

## Version bump before republish

You cannot republish the same version. To publish again:

```bash
npm version patch   # or minor / major
npm publish --access public
```

Then commit and push the new tag if desired.

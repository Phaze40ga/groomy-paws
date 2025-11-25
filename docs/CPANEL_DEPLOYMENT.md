## Deploying to cPanel / Hostinger

These steps assume you already uploaded the repository to your account (for example under `~/public_html/groomy-paws`) and have SSH access plus the “Setup Node.js App” feature enabled.

### 1. Install dependencies & build the frontend

```bash
cd ~/public_html/groomy-paws
npm ci
echo "VITE_API_URL=https://groomypawssalon.com/api" > .env.production   # adjust domain/API path
npm run build                                                           # outputs to dist/
```

Point your domain’s document root to `~/public_html/groomy-paws/dist`, or copy/symlink the files in `dist/` into the directory that serves `https://<your-domain>`.

### 2. Configure the cPanel Node.js application

1. cPanel → **Setup Node.js App** → **Create Application** (or edit existing).
2. Fields:
   - **Application root**: `/home/<user>/public_html/groomy-paws/server`
   - **Application URL**: your domain (leave the path blank for `/`)
   - **Application startup file**: `app.js`
   - **Node version**: 20+
   - **Environment**: Production
3. Add environment variables:
   ```
   PORT=3002
   DB_HOST=localhost
   DB_NAME=groomypaws_app
   DB_USER=groomypaws_admin
   DB_PASSWORD=<your password>
   JWT_SECRET=<strong random string>
   NODE_ENV=production
   ```
4. Click **Create/Update** then **Restart App** (or from SSH run `touch ~/public_html/groomy-paws/server/tmp/restart.txt`).

The included `server/app.js` simply imports `src/index.js`, which keeps Passenger happy because it looks for a startup file in the application root.

### 3. Verify the API

```bash
curl https://<your-domain>/api/health
```

Expected response: `{"status":"ok","database":"connected"}`. If you see a 404 or Passenger error, tail the logs:

```bash
tail -n 100 ~/logs/nodejs/<app-name>/error.log
```

### 4. Optional: restart from SSH

Whenever you deploy new code:

```bash
cd ~/public_html/groomy-paws/server
npm install --omit=dev           # only when package.json changes
touch tmp/restart.txt            # tells Passenger to reload
```

This avoids needing to open the cPanel UI for every publish.






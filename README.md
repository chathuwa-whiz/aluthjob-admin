# AluthJob admin console

The operator's console for the AluthJob API in `../server`, served at `https://admin.aluthjob.com`. React 19, Vite,
TypeScript, TanStack Query, React Router. No UI framework: the design system is a few hundred lines of CSS in
`src/styles/`, with Geist for type and Phosphor for icons.

What an administrator can do here, in one place:

| Screen | What it covers |
| --- | --- |
| Overview | Counts, a 30-day activity chart, vacancy sources, and a "needs attention" list built from live numbers |
| Vacancies | Search and filter every collected vacancy, edit one, read its advert again, delete one or many, purge old closed ones |
| Collection | Start a collection (all sources or one), follow it live, read full adverts in bulk (OCR), see the last run |
| Matches | Review a match and why it scored as it did, skip or reopen it, edit its letter, delete it |
| Applications | The send queue: cancel, retry, delete, stop everything queued; exactly what was sent |
| Users | Create, promote or demote, verify an address, send a reset email, sign out everywhere, delete |
| Resumes | Read the extracted profile and correct it, download the CV, move it to another account, start a search, delete |
| Mailboxes | Every connected mailbox (never its password), disconnect one |
| Sessions | Every live sign-in; end one or purge the expired |
| Audit log | Every change made from the console, with who and when |
| System | Database, model keys, mail worker and queue, collection schedule, security settings (read only) |

`Ctrl K` (or `Cmd K`) opens a quick search and jump from anywhere. Lists keep their filters and page in the address
bar, and an open record is `?open=ID`, so anything can be linked.

## Run it in development

```bash
# terminal 1: the API (see ../server/.env.example)
cd ../server && npm run dev

# terminal 2: this app, on http://localhost:3001
npm install
npm run dev
```

The API's `.env` needs this app's address next to the public site's, because the browser sends it as the request
origin and the API only accepts origins it was told about:

```
FRONTEND_URL=http://localhost:3000,http://localhost:3001
```

Vite forwards `/api` to `http://localhost:4000` (`VITE_DEV_API` changes that), so the session cookie is first-party in
development.

Becoming an administrator is deliberately not possible through the API. On the server:

```bash
npm run make-admin -- someone@example.com        # grant
npm run make-admin -- someone@example.com --revoke
```

An administrator can then promote or demote *other* accounts from the Users screen (never their own).

## Put it on admin.aluthjob.com

```bash
npm run build      # writes dist/ (VITE_API_URL=https://api.aluthjob.com comes from .env.production)
```

On the API server set both sites as allowed origins, then restart it:

```
FRONTEND_URL=https://aluthjob.com,https://admin.aluthjob.com
```

The session cookie lives on the API's host (`api.aluthjob.com`) and is `SameSite=Lax`. `admin.aluthjob.com` and
`api.aluthjob.com` are the same site, so the browser sends it on this app's API calls. Signing in here and on the
public site is the same session: signing out of one signs out of the other.

Example for nginx (adjust paths and certificates):

```nginx
server {
    listen 443 ssl http2;
    server_name admin.aluthjob.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    root /var/www/aluthjob/admin/dist;

    # strict policy: scripts, styles and fonts only from this site; the API is the one other place it may talk to
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.aluthjob.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy same-origin always;
    add_header X-Robots-Tag "noindex, nofollow" always;

    location / {
        try_files $uri /index.html;   # client-side routes
    }

    # fingerprinted files never change
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
}
```

Consider also restricting this site to your own IP address or a VPN at the proxy: the sign-in is rate limited by the
API, but an administrator console has no reason to be open to the world.

## Decisions worth knowing

- **Everything an administrator does is recorded.** Each change, and each CV download, is written to the
  `admin_audit` table (created automatically) and shown on the Audit log screen. The trail has no foreign keys, so it
  survives the users and records it names.
- **Applicants keep their consent.** The console cannot approve a cover letter, confirm an address read from a
  picture, or queue an application. Editing a letter withdraws its approval, so nothing an administrator changes can go
  out unseen. Administrators can skip a match, cancel or retry a send, and delete records.
- **Nobody sees a secret.** Mailbox passwords are never returned (not even encrypted), an administrator never sets or
  sees another person's password (the reset email lets them choose their own), and the System screen reports whether
  `MAIL_SECRET` and the like are set, never their values.
- **Destructive actions ask first.** Deleting an account asks for its email address to be typed; deleting a resume
  asks for the word `delete`. An administrator cannot delete or demote their own account.
- **Settings are read only.** They come from the server's environment; changing them needs a restart, so the System
  screen shows them rather than pretending to edit them.
- **Links from adverts are untrusted.** Job pages are scraped, so any address could be `javascript:...`. Only plain
  `http(s)` addresses become links (`src/lib/format.ts`, `safeHref`).
- **Phones are first class.** Tables turn into labelled cards, side panels become full-screen sheets, the menu is a
  drawer, and controls grow on touch screens. Light and dark follow the system; the sidebar can pin either.

## How it is organised

```
src/
  api/         the HTTP client (one place), every endpoint, data shapes, query hooks
  auth/        the session provider and the administrator gate
  layout/      the shell (sidebar, phone menu), quick search, change-password dialog
  ui/          buttons, fields, tables, side panel, dialogs, toasts, charts: one vocabulary used everywhere
  pages/       one file per screen, each loaded on demand
  lib/         formatting, address-bar state, small hooks
  styles/      tokens (colour, type, space), base, components, layout
```

The server side lives in `../server/src/routes/admin.routes.ts` (the API), `../server/src/admin/` (queries and
operations) and `../server/src/routes/admin.test.ts` (access control and every action; these tests need the Oracle
test database described in `../server/.env.test.example`).

# Al Shamail — Local Setup Guide (Windows)

## What You Need First

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS or newer | https://nodejs.org |
| pnpm | any | `npm install -g pnpm` (after Node.js) |
| PostgreSQL | 16 or 17 | https://www.postgresql.org/download/windows/ |

> **PostgreSQL 18 warning:** PG 18 has a known async I/O crash on Windows.
> Use version 16 or 17 instead.

---

## Step 1 — Configure your database password

Open `.env` in the project root and make sure the password matches what
you set during PostgreSQL installation:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/appdb
SESSION_SECRET=any-long-random-string-here
```

The `.env` file already contains `murtaza123` as the password. Change it
here if you ever change your PostgreSQL password.

---

## Step 2 — First-time setup (run once)

Double-click **`setup.bat`** — or from a CMD/PowerShell window:

```
setup.bat
```

This will:
1. Install all Node.js dependencies (`pnpm install`)
2. Create the `appdb` database tables (`pnpm --filter @workspace/db run push`)

---

## Step 3 — Start the app

Double-click **`start.bat`** — it opens two CMD windows:

| Window | Service | URL |
|--------|---------|-----|
| Al Shamail API Server | Express backend | http://localhost:3001 |
| Al Shamail Frontend | Vite dev server | http://localhost:5173 |

Your browser opens automatically at **http://localhost:5173**

---

## Demo login accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@alshamail.edu | admin123 |
| Teacher | teacher@alshamail.edu | teacher123 |
| Student | student@alshamail.edu | student123 |

Demo users are seeded automatically when the API server boots for the first time.

---

## Stopping the app

Close both CMD windows, or press `Ctrl+C` in each one.

---

## Troubleshooting

**"pnpm is not recognized"**
→ Install Node.js first, then run `npm install -g pnpm` in CMD, then re-open CMD.

**"ECONNREFUSED" or database errors**
→ PostgreSQL is not running. Open Windows **Services**, find
`postgresql-x64-16` (or similar) and click **Start**.

**"password authentication failed"**
→ Open `.env` and update `DATABASE_URL` with the correct PostgreSQL password.

**Tables do not exist**
→ Run `setup.bat` again, or in CMD:
```
pnpm --filter @workspace/db run push
```

**Port already in use (3001 or 5173)**
→ Close other Node.js processes, or edit `start.bat` to use different ports
and update `artifacts/al-shamail/vite.config.ts` proxy target to match.

**API server exits immediately**
→ Check that `DATABASE_URL` is set in `.env` and PostgreSQL is running.
The API server waits up to 15 seconds for PostgreSQL before giving up.

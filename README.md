# Banters & Cash — Next.js FPL Tracker Starter

This is a full restructure starter for your FPL group app using:
- TypeScript
- Next.js App Router
- React
- CSS
- file-based local storage for cached data and payment statuses

## What is already organized
- One **Fetch data** button
- League info moved into its own **League Info** tab
- **Overall Rankings** tab
- **Weekly Winners** tab
- **Managers** tab with manager win summary
- **Admin** tab for payment tracking
- Red and green arrows for rank/points movement
- Manager profile pages
- Winner logic based on **gameweek points minus transfer cost**

## Important production note
This starter stores admin payment state in local JSON files inside `/data`.
That is fine for local development.
For a real Vercel production deployment, move payment/admin/auth data to a hosted database such as Supabase Postgres.

## Official stack direction
Next.js supports the App Router and file-based routing, which fits this project structure well. citeturn253631search0turn253631search11turn253631search13turn253631search19
Vercel's Hobby plan is free for personal and small-scale apps, but Hobby cron jobs are limited to once per day, which matters if you later automate FPL refreshes. citeturn253631search1turn253631search4turn253631search16turn253631search18
Supabase documents a Next.js Auth quickstart for the App Router, which is a good path for manager/admin login in the next phase. citeturn253631search2

## Run locally
1. Extract the zip
2. Open the folder in VS Code
3. Run:

```bash
npm install
npm run dev
```

4. Open:

```text
http://localhost:3000
```

5. Click **Fetch data**

## Notes on manager profiles
The manager profile page is included.
For official FPL team changes, the profile page includes a link to the official FPL team page.
This starter does **not** log into FPL or submit official lineup changes.

## Main files
- `app/page.tsx` — dashboard shell
- `components/dashboard.tsx` — tabs and UI
- `lib/fpl.ts` — FPL fetch + calculations
- `app/managers/[entryId]/page.tsx` — manager profile page
- `app/api/fetch-data/route.ts` — refresh cache
- `app/api/payments/route.ts` — update payment status

## Suggested next phase
- move payments/auth to Supabase
- add protected admin login
- add user login per manager
- deploy to Vercel

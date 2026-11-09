# BizzOne Digital — Onboarding Form & Dashboard

This file documents how this project works end-to-end, so it can be used as a
reference when building a new, separate onboarding-form project from scratch.
It is written from the perspective of "what did we actually build and why,"
including the bugs we hit and how they were fixed — not just a feature list.

## Stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- MongoDB Atlas (driver: `mongodb` npm package, no ORM) — database name `bizzone`
- Cloudinary for image uploads (logos)
- Auth: a single shared dashboard password, session stored as a signed JWT
  (`jose`) in an httpOnly cookie (`bz_auth`), no per-user accounts
- Deployed on Vercel; GitHub repo `BizzOne-Digital/Bizzoneform`, `main` branch
- No test suite — correctness is checked with `npx tsc --noEmit` and
  `npx next build` before every push

## Project shape

```
src/
  app/
    page.tsx                    — public onboarding form page (renders LeadForm)
    layout.tsx                  — root layout; sets noindex/nofollow + robots meta
    robots.ts                   — robots.txt (disallow all — site is link-only, not for Google)
    api/
      lead/route.ts             — form submission endpoint (public)
      lead/upload-logo/route.ts — logo upload (public, used by the lead form)
      submissions/route.ts      — dashboard CRUD for submissions (auth required)
      logs/route.ts             — form-attempt logging (POST public, GET auth)
      upload-logo/route.ts      — logo upload from inside the dashboard
      chat/route.ts             — marketing FAQ chatbot (Anthropic API w/ keyword fallback)
      credentials/...           — separate secure "collect client's domain/payment
                                   credentials after they approve the site" flow
    dashboard/
      page.tsx + client.tsx     — main admin dashboard (the bulk of the work)
      login/page.tsx            — password login screen
      logs/page.tsx + client.tsx— form submission logs viewer
    credentials/page.tsx        — public page a client uses to submit their
                                   domain/payment credentials via a one-time link
  components/
    LeadForm.tsx                — the public onboarding form itself
    ChatBot.tsx                 — decision-tree FAQ widget on the public page
    Reviews.tsx                 — testimonials section (currently unmounted from page.tsx,
                                   component/data kept, just not rendered)
    CredentialsForm.tsx, CredentialsChatBot.tsx, DashboardCredentials.tsx
                                 — the credentials-collection subsystem's UI
  lib/
    mongodb.ts                  — connection + collection getters (submissions,
                                   form_logs, credentials)
    auth.ts                     — JWT session create/check
    encryption.ts, tokens.ts, credentials-labels.ts, credentials-service.ts
                                 — credentials subsystem internals (AES-encrypted
                                   fields, one-time signed request tokens)
    services.ts                 — small shared constants
  middleware.ts                 — subdomain rewrites (credentials./onboarding.)
```

## Data model (MongoDB, `bizzone` database)

### `submissions` collection
One document per onboarding form submission. Core client-entered fields are
plain strings (business, name, email, phone, site, social, industry, goal,
audience, logo, colors, style, inspo, pages, headline, about, services_list,
pricing_details, has_pricing, contact_page, special_offers, file_details,
notes, package, addons) — all normalized to `"—"` when empty on the way in
(see `v()` helper in `api/lead/route.ts`).

Team-editable fields added on top of the raw submission, all optional and all
PATCHed independently via `/api/submissions`:

| Field | Type | Meaning |
|---|---|---|
| `status` | `"new" \| "in_progress" \| "done" \| "on_hold"` | legacy status field — still editable from the detail panel but **no longer shown as a column in the table** (removed for clutter; see Design decisions) |
| `assigned_to` | string | one of the `TEAM` roster names, dropdown-only (no free text) |
| `internal_notes` | string | free text, team-only |
| `target_month` | `"YYYY-MM"` | the month a site is considered "due" in. Defaults to the submission month (`created_at`'s month) and **only ever changes when a team member explicitly uses the month-shift arrows** — there is deliberately no automatic forward-rolling (see Design decisions / Bugs below) |
| `domain_connected` | boolean | whether the client's domain has been connected/live |
| `domain_connected_at` | ISO string \| null | timestamp stamped automatically the moment `domain_connected` flips `false → true`; cleared back to `null` if unset. This is what "Domain Connected" views filter by — **not** `target_month** |
| `project_closed` | boolean | independent flag for "client went unresponsive / we're closing this out" — intentionally decoupled from `status` |
| `logo_url` | string | Cloudinary URL, editable/replaceable from the dashboard |
| `package` | string | editable after submission via a dropdown (`PACKAGES` in client.tsx), not just the client's original choice |

A one-time backfill (`backfillTargetMonth()` in `api/submissions/route.ts`,
runs on every GET) fills `target_month` from `created_at` for any doc that
doesn't have it yet, and backfills `domain_connected_at` from `created_at` for
docs that were marked connected before that field existed.

### `form_logs` collection
Every onboarding-form submit *attempt* (not just successes) gets logged here
via `POST /api/logs`, fired from inside `LeadForm.tsx`'s `submit()`/`fail()`
helpers: `{ created_at, status: "success"|"failed", reason, name, business,
email, phone }`. This exists so the team can see, after the fact, exactly why
a given client couldn't submit (client-side validation message, server error,
or network error) without needing live/real-time log tailing.

### `credentials` collection (separate subsystem, not covered in depth here)
Stores a client's domain login + payment gateway keys, submitted through a
one-time signed-token link (`/credentials?token=...`) sent after a site is
approved. Sensitive fields are AES-encrypted at rest (`lib/encryption.ts`);
tokens are hashed before storage (`lib/tokens.ts`). This is intentionally
decoupled from the onboarding flow and mostly wasn't touched while building
the dashboard features below — treat it as a separate module to port if the
new project needs it.

## The dashboard (`app/dashboard/client.tsx`) — what it actually does

This is the single biggest file and the one most worth re-reading before
rebuilding any of this. Views, left to right in the sidebar:

- **All Websites** — every submission, no month filter.
- **This Month** — filtered by `target_month` (falls back to `created_at`'s
  month if `target_month` is somehow still missing).
- **Domain Connected** — filtered by `domain_connected: true` **and**
  `domain_connected_at`'s month matching the selected month. Explicitly *not*
  based on `target_month` — a site targeted for July whose domain goes live
  in August shows under August, not July.
- **Closed Projects** — filtered by `project_closed: true`, with **no month
  filter at all** (a closed project should show regardless of when it was
  submitted).
- **Team** (Zubair / Shumaila / Memoon Javed / Atif) — clicking a name scopes
  everything to `assigned_to: <name>`, then exposes three sub-tabs:
  - *All Websites* — that person's assigned sites, filtered by `target_month`
    (so it also has its own month prev/next arrows)
  - *Domain Connected* — same `domain_connected_at`-month logic as the global
    view, scoped to that person
  - *Closed* — same as the global Closed Projects view, scoped to that
    person, **also with no month filter**

The list table always sorts by `target_month` first, then `created_at`
within that — this was a deliberate fix (see Bugs) so rows never visually
jump between months when sorted purely by submission date.

Other dashboard features:
- **Package breakdown per developer** — when viewing a Team member, submissions
  are grouped by package tier (`packageBucket()` normalizes old label variants
  like "Starter" → "Standard" so historical data still buckets correctly) and
  shows site counts / domain-connected counts per tier. Dollar amounts were
  explicitly removed from this view per a later request — don't re-add $ totals
  without being asked.
- **CSV export** ("Generate Report" button) — exports whatever's currently
  filtered/visible, not the whole database.
- **Debounced search** — the search box uses a separate `searchInput` state
  that updates instantly, with the actual `search` state (which triggers the
  fetch) updated via a 350ms `setTimeout`. Without this, every keystroke
  re-fetched and caused visible UI jank — binding the input directly to the
  fetch-triggering state was the bug.
- **Logo upload/replace/remove** directly from the detail panel, via Cloudinary.
- **Delete** requires an inline two-step confirm (not a native `confirm()`).

## Design decisions worth preserving in a rebuild

1. **"Hide from the UI" ≠ "delete the data."** Several requests in this
   project's history were "remove X from the website" (Reviews section, the
   5-step process section, certain add-on options, the Status column). In every
   case the correct move was to stop *rendering* it, not delete the underlying
   component, data field, or array entry. This is a standing rule the user set
   explicitly — carry it into any new project.
2. **Boolean status flags should be independent toggles, not enum values
   crammed into one `status` field.** `domain_connected` and `project_closed`
   were both built as separate boolean fields with their own instant-toggle
   buttons, specifically so they compose freely (a site can be closed *and*
   domain-connected, or neither) instead of fighting over one dropdown.
3. **Toggle buttons that represent "did a thing happen" should PATCH
   immediately on click**, independent of whatever else is being edited in the
   same detail panel. Bundling them into a batched "Save Changes" button was
   the root cause of a real data-corruption bug (below) — don't repeat that.
4. **Timestamps for "when did X happen" should be their own field
   (`domain_connected_at`), auto-stamped server-side on the `false→true`
   transition** — not derived from `target_month`, and not something the
   client ever sends directly.
5. **Any field a client fills in free-text that the team needs to later filter
   by reliably (assigned developer, package tier) should become an admin-side
   dropdown, not free text** — `assigned_to` and the dashboard's package field
   are both constrained dropdowns for exactly this reason, even though the
   original client-facing form may have free text.
6. **Never auto-migrate/roll forward date-ish fields based on "is this still
   incomplete".** This was tried (auto-roll `target_month` forward to the
   current month for any site with `domain_connected: false` and
   `status !== "done"`) and reverted — see Bugs below. If similar
   "still-pending" tracking is needed in the new project, make it a read-time
   *filter* (e.g. "This Month" + "not connected"), never a write that mutates
   stored data on a schedule.
7. Mongo query building in `/api/submissions` layers independent filters as
   separate `$and` clauses (`$monthFilter`, `$searchFilter`) rather than
   stomping on a shared `$or` key — needed because multiple optional filters
   can be active simultaneously.

## Bugs hit during development (read before reusing patterns)

- **Auto-rollover feedback loop.** An early version auto-moved any
  not-yet-domain-connected, not-"done" site's `target_month` forward to the
  current month on every page load. This silently dragged old, already-
  completed-looking work into "this month," and — worse — once a site is
  older than today, *every* dashboard load kept re-rolling it, so a one-time
  DB fix alone didn't hold. Fully removed the auto-roll; `target_month` now
  only changes via an explicit, user-initiated action.
- **"Save Changes" clobbering `target_month`.** The detail panel's "Save"
  button unconditionally re-sent `target_month: eMonth` alongside whatever
  else it was saving (originally including `domain_connected` too). A stray
  click on the month-shift arrows (which self-save instantly) right before
  toggling Domain Connected and clicking Save would silently re-persist the
  accidental month shift. Fix: Domain Connected and Project Closed now save
  instantly on their own, and `save()` no longer touches them at all, so
  nothing mutates `target_month` as a side effect of an unrelated toggle.
- **Legacy package labels.** Old submissions used different label text for
  the same tier (e.g. "Starter ($79)" vs "Standard ($79)"). Reporting/grouping
  code must normalize through `packageBucket()` rather than doing exact string
  matches against the current `PACKAGES` labels.
- **Search-input jank.** Binding the search `<input>` directly to the
  fetch-triggering state caused a request (and re-render) per keystroke.
  Fixed with a debounced intermediate state (see above).

## Conventions for working in this repo

- Run `npx tsc --noEmit -p tsconfig.json` and `npx next build` after every
  change before telling the user it's ready — this has caught real issues
  every time it's been skipped.
- Never push to `main` without being explicitly told to; the user says "push"
  when ready.
- Treat any direct MongoDB write script (one-off data fixes/backfills) as
  requiring explicit confirmation first — these touch live production data
  with no undo.
- `.env.local` holds `MONGODB_URI`, Cloudinary keys, `DASHBOARD_PASSWORD`/
  `DASHBOARD_PASSWORD_HASH`, `SESSION_SECRET`. There is no staging database —
  local dev and production share the same MongoDB Atlas cluster, so local
  testing (e.g. submitting a test lead) writes real data into the live
  database. Label test records clearly (e.g. business name "Test ..." and a
  note saying it's a test) rather than creating a separate database.

## What a new, separate onboarding-form project would need to replicate this

At minimum: the `submissions` schema and its optional team-editable fields,
the `/api/submissions` GET/PATCH/DELETE pattern, the dashboard's view/filter
model (month-based vs. connection-date-based vs. unfiltered), the per-team-
member scoping, and the "toggles save instantly, never bundled with
Save Changes" rule. The credentials and chatbot subsystems are optional
add-ons, not core to "an onboarding form with a dashboard," and can be left
out of a v1 rebuild.

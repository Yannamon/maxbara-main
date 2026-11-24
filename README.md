# Max Bara

**Company formation and application management for Côte d’Ivoire.**

Max Bara helps entrepreneurs prepare a company registration, understand estimated costs, organize supporting documents, and follow their application. French and English interfaces support applicants in Côte d’Ivoire and abroad, including those working through a local representative.

## Features

- **Company formation estimates:** server-calculated XOF estimates with itemized fees, optional services, and pricing review for unsupported scenarios.
- **Registration checklist:** expandable CEPICI-based guidance with progress saved in the visitor’s browser.
- **Applicant workspace:** email or SMS authentication, detailed application drafts, status tracking, and document management.
- **Document preparation:** a dedicated modal for each non-ID document, saved preparation fields, and separate uploads for final official documents. Shareholder and director IDs use a direct uploader.
- **Payments:** Paystack hosted checkout, server-side payment verification, signed webhooks, and separate manual payment confirmation.
- **Appointments:** Google Calendar booking-page integration with an appointment-request fallback.
- **Administration:** application search, submission deadlines, internal notes, document review, and estimated margins.
- **Accessible motion:** a reversible hero background wipe and restrained interface transitions that respect reduced-motion preferences.

## Technology

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling and motion | Tailwind CSS 4, custom CSS, Motion for React |
| Authentication | Supabase Auth with server-side cookie sessions |
| Database | Supabase PostgreSQL through `pg` |
| Document storage | Private Supabase Storage bucket |
| Payments | Paystack hosted checkout and verification API |
| Testing | Node.js test runner and TypeScript checks |

## Getting started

### Prerequisites

- Node.js **22.18 or newer** and npm.
- A Supabase project with access to its database connection details.
- Paystack test credentials to exercise online payments.
- Docker and the Supabase CLI only if running Supabase locally.

### 1. Install the application

```sh
git clone https://github.com/Yannamon/maxbara.git
cd maxbara
npm ci
```

Copy the environment template:

```sh
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` and `npm.cmd` if your shell prevents running `npm`.

### 2. Configure environment variables

Fill in `.env.local` using values from your own accounts. The example file contains placeholders only.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project API URL; required for authentication and storage. |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key for user authentication. |
| `SUPABASE_SECRET_KEY` | Server-only secret key for private document storage. |
| `DATABASE_URL` | PostgreSQL connection string, including the database password; required for application records. |
| `APP_URL` | Exact application origin, including the development port; required for production Paystack callbacks. |
| `PAYSTACK_SECRET_KEY` | Server-only Paystack test or live API key. |
| `PAYSTACK_WEBHOOK_SECRET` | Dedicated webhook signing secret, when enabled in Paystack. |
| `APPOINTMENT_BOOKING_URL` | Optional public Google Calendar appointment-schedule booking link. |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are also supported and take precedence over their unprefixed equivalents. Database and secret API keys must remain server-only.

**Authentication and database access are separate connections.** A Supabase HTTPS API URL cannot be used as `DATABASE_URL`. Copy a PostgreSQL connection string from the Supabase project’s **Connect** panel. Use the session pooler when your local network cannot reach the direct IPv6 database address; choose a connection mode appropriate for your production host.

Replace the password placeholder completely, including its square brackets. Percent-encode special characters in the password. The database password is distinct from a Supabase API key and an applicant’s login password. Restart the server after changing environment variables.

### 3. Apply database migrations

Apply the SQL files in `supabase/migrations` to the same Supabase project used for authentication, in this order:

| Migration | Purpose |
| --- | --- |
| `20261119000000_foundation.sql` | Users, companies, cases, quotes, documents, payments, and access restrictions. |
| `20261119000100_client_intake.sql` | Intake data, duplicate-payment protection, and private document bucket. |
| `20261119000200_admin.sql` | Review timestamps and administrative event tokens. |
| `20261124000000_appointments.sql` | Appointment requests. |
| `20261124000100_document_forms_paystack.sql` | Document preparation drafts and Paystack payment fields. |

For a hosted project, run each unapplied migration through the Supabase SQL Editor or your established Supabase migration workflow. On an existing database, apply only missing migrations; the foundation and admin migrations are not intended to be rerun.

For a local Supabase instance:

```sh
npx supabase start
npx supabase migration up --local
```

Use the local connection details supplied by Supabase in `.env.local`.

### 4. Configure authentication

Enable **Email** authentication in Supabase Auth and set its Site URL to your application origin. Create an account at `/login`, confirm the email if required, and sign in.

SMS sign-in additionally requires the Phone provider and an SMS provider. The SMS flow accepts Ivorian phone numbers. Email-authenticated applicants can submit international contact numbers in their application without completing an Ivorian phone login. Only a verified Ivorian Auth phone is stored in the profile phone column.

### 5. Start development

```sh
npm run dev
```

Open `http://localhost:3000`. To use another local port:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Keep the Supabase Auth Site URL and `APP_URL` aligned with the origin you actually use.

## Main routes

| Feature | French | English |
| --- | --- | --- |
| Homepage | `/` | `/en` |
| Estimate | `/devis` | `/en/quote` |
| Preparation checklist | `/checklist` | `/en/checklist` |
| New application | `/commencer` | `/en/start` |
| Application list | `/dossiers` | `/en/cases` |
| Application details | `/dossiers/[reference]` | `/en/cases/[reference]` |
| Appointments | `/rendez-vous` | `/en/appointments` |
| Administration | `/admin` | `/en/admin` |

The shared email sign-in page is `/login`; the applicant dashboard is `/dashboard`.

## Application and document workflow

1. Sign in and choose **Start a new application**, or continue from an estimate.
2. Enter applicant contacts, company activities and capital, shareholders, managers, registered office, and any representation requirements.
3. Save the draft. Supported scenarios receive a server-calculated estimate; other scenarios are saved for pricing review without an automatic quote.
4. Open individual document forms to prepare details. Upload the final documents separately, including any required signatures, authentication, or translations.
5. Upload shareholder and director IDs directly, then send the completed application to Max Bara for review.

Document drafts do not satisfy final-document requirements. Files remain private, are checked for supported formats, and have a **3 MB** limit. Uploads support PDF, JPEG, PNG, WebP, and recognized HEIC/HEIF formats. Browser photo compression may reduce oversized JPEG, PNG, and WebP images.

Application details and document drafts are stored in PostgreSQL. The public checklist’s completion state is stored only in the current browser. Application form answers are retained on the page after a save failure, but are not a browser-persisted backup.

## Paystack setup

Start with a Paystack **test** key. Set `PAYSTACK_SECRET_KEY`, `APP_URL`, and the matching `PAYSTACK_WEBHOOK_SECRET` if dedicated webhook signing is enabled. A public key is not needed for the hosted redirect checkout used here.

Configure this publicly reachable endpoint in Paystack:

```text
https://YOUR-DOMAIN/api/paystack/webhook
```

The application supplies `/api/paystack/callback` automatically when initializing checkout. A webhook cannot reach `localhost`; use a public deployment or a development tunnel for webhook testing.

Payment behavior:

- Only the application owner can initiate checkout, and a final XOF estimate is required.
- The amount comes from the stored quote. Whole FCFA amounts are multiplied by 100 for the Paystack API.
- Server verification checks the reference, amount, currency, test/live mode, and payment metadata before confirming payment.
- Callbacks and signed webhooks can safely confirm the same payment repeatedly without duplicating the payment event.
- Pending checkout links are reused. Verified failed or abandoned attempts can retry with a new reference.
- Modern timestamped signatures are required when a dedicated webhook secret is configured; otherwise the legacy API-key signature is supported.
- Manual payment remains separate and cannot replace an active Paystack checkout.

Payment methods offered in hosted checkout depend on the Paystack account and market. Card or mobile-money availability is not guaranteed by the app. Test and live credentials and webhook settings must belong to the same mode.

## Appointment setup

Set `APPOINTMENT_BOOKING_URL` to your Google Calendar appointment-schedule booking page. Applicants then choose an available time on Google’s booking page. These bookings are managed in Google Calendar and are not synchronized into the app’s request list.

When no booking link is configured, signed-in applicants can request a preferred date, time, timezone, and topic. Requests remain **requested**, not confirmed. Administrators can review them on the appointment page. This fallback does not reserve calendar availability or send automatic emails; applicants may add a pending reminder to their own Google Calendar after saving.

## Administration

Create an application once to establish the operator’s profile, then assign its role through a trusted database session:

```sql
update public.users
set role = 'admin'
where auth_user_id = 'REPLACE_WITH_OPERATOR_AUTH_UUID';
```

Administrative pages enforce the role on the server. Operators can review applications, document drafts and uploaded files, maintain internal notes and next steps, track review and delivery deadlines, and confirm manual payments. The configured review and delivery periods are internal tracking targets, not guaranteed government processing times.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm test` | Run the Node.js test suite. |
| `npm run build` | Build the production application. |
| `npm start` | Serve the production build. |
| `npm run db:seed` | Insert demonstration cases into a configured development database. |

Before publishing changes:

```sh
npm run typecheck
npm test
npm run build
```

The automated suite covers pricing, intake validation, document requirements and draft validation, file signatures, database URL validation, administrative filtering and deadlines, payment amount matching, and webhook signature verification. A passing local suite does not replace an end-to-end Paystack test against your own test account.

Use `npm run db:seed` only with a development database. The seed uses fixed identifiers so it can be rerun without duplicating its demonstration records.

## Project structure

```text
src/
  app/          Localized routes, layouts, and Paystack HTTP endpoints
  site/         Public pages, translations, checklist, and motion components
  intake/       Applications, document forms, uploads, and appointments
  dashboard/    Applicant workspace and email authentication actions
  admin/        Operator pages, authorization, and case administration
  payments/     Paystack initialization, verification, and signature checks
  server/       PostgreSQL access and quote calculation
  config/       Pricing and environment validation
supabase/
  migrations/   Versioned database schema changes
scripts/        Automated tests and demonstration data
public/         Static brand assets
```

## Deployment

Deploy to a Node.js-compatible Next.js host. The app requires server rendering, server actions, route handlers, and PostgreSQL access; it is not a static export.

1. Configure the environment variables on the host, using the production HTTPS origin as `APP_URL`.
2. Apply all unapplied migrations to the target Supabase project.
3. Set the Supabase Auth Site URL for the deployment and confirm the required authentication providers.
4. Configure the Paystack webhook and matching test/live credentials.
5. Run the production checks, build, and deploy.
6. Verify sign-in, draft creation, private uploads, appointment access, and a Paystack test transaction with webhook delivery.

Keep `.env.local`, database passwords, API secrets, generated builds, and uploaded applicant documents out of Git. The environment template contains no real credentials. Browser roles have no direct access to application tables; authenticated server actions and server-only integrations handle access.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Sign-in is unavailable | Supabase URL and publishable key, enabled Auth provider, and server restart after configuration changes. |
| Signed in, but application data is unavailable | PostgreSQL `DATABASE_URL`, connectivity, and applied migrations. Auth keys alone do not connect the database. |
| Password authentication fails | Correct database password, percent-encoding, and removal of template square brackets. |
| Direct database connection times out | IPv6 reachability; use the session pooler when the local network needs IPv4. |
| Missing table or column | Apply the corresponding unapplied migration to the same project used by the app. |
| Document draft or upload fails | Ownership, draft status, document schema migration, private bucket, storage secret, format, and file size. |
| Paystack button is disabled | Valid `PAYSTACK_SECRET_KEY` and `APP_URL`; restart after changes. |
| Payment is still pending | Verify API response, matching amount and mode, webhook URL, signature secret, and delivery logs. |
| Appointments show a request form | `APPOINTMENT_BOOKING_URL` is not configured; requests do not confirm a calendar slot. |

## Registration guidance and pricing scope

The public checklist focuses on a SARL with capital below 10 million FCFA and links to CEPICI documents. Automatic pricing covers the configured SARL scenario at 1,000,000 FCFA capital; other forms and capital amounts require review. Some fee components remain provisional and retain their verification status in saved quotes.

Requirements depend on legal form, activities, contributions, documents, and country of execution. Overseas applicants should confirm power-of-attorney authentication, translations, and original-document delivery with CEPICI and the relevant Ivorian consulate. Preparation forms are not substitutes for official or notarized documents.

Official references:

- [CEPICI registration forms and checklists](https://www.cepici.ci/index.php/creation-entreprise)
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Paystack payment integration](https://paystack.com/docs/payments/accept-payments/)
- [Paystack webhook verification](https://paystack.com/docs/payments/webhooks/)
- [Google Calendar booking-page sharing](https://support.google.com/calendar/answer/10733297)

## Public SEO and audience messaging

The public pages address Ivorians living abroad and international investors in French and English. Package benefits expand on desktop hover and remain available through native keyboard and touch controls. The application distinguishes sending documents for review from formal filing; payment is not required to send an application for review. The recommended commercial sequence is review, scope and quote confirmation, then payment before official filing. This release does not introduce a server-enforced filing/payment gate or a new government-registration status.

Set `SITE_URL` to the public HTTPS origin (currently `https://maxbara.netlify.app`) before building. A valid public HTTPS `APP_URL` is used as a fallback. Rebuild after changing the public origin. Homepage, checklist and estimator metadata provide localized titles, descriptions, canonical URLs, reciprocal `fr`/`en` links and `x-default`. `/sitemap.xml` includes only those public routes. Workspace pages inherit `noindex`; `/robots.txt` excludes private and action routes. Without a public HTTPS origin, canonical URLs are omitted and the sitemap is empty, with crawling disabled to avoid advertising a localhost deployment.

The landing pages include service structured data and practical questions about overseas registration, local representation, review and payment. No search ranking, processing deadline, investment return, tax advantage or package-specific entitlement is guaranteed by this content. Confirm the precise scope of each package with the business before turning preparation benefits into contractual inclusions.

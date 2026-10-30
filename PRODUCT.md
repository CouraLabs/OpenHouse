# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who runs a home, alone or with other people. A person living alone
uses Kantim as their own home's organizer; a couple, a family or a shared
flat signs in to the same home and runs it together. One tenant is one home.
Members join with an invite code and are on equal footing: everyone reads
and writes the same data. Roles exist only where the data model needs them
(only the owner may delete the whole home). Shared features stay out of the
way for a home of one.

## Product purpose

Kantim is an open-source home management app. It keeps what a home runs on
in one place: the money, the pantry, the chores, the pets, the upkeep of the
house and the people who live in it. Today the money part is live. The rest
arrives as modules of the same home, with the same sign-in and the same
members.

Kantim should also look ahead for the home: warn that the detergent is
running low or the pet food expires soon, remind about the power bill, and
suggest chores for the weekend. Storing the data comes first, and the
reminders are built on top of it.

Success is a home that trusts Kantim enough to drop its side spreadsheets,
fridge notes and group-chat reminders.

## Modules

Six modules, each a section of the app with its own features. Until a module
ships, the product presents it as planned, never as live.

1. Finance (live). Accounts and cards, transactions, bills to pay, upcoming
   balances, recurring rules, category limits as the budget, goals,
   expense splits between members, and statement imports. Still missing:
   a monthly report.
2. Pantry. Food on hand, expiry dates, the shopping list, consumption
   history, and recipe ideas from what is already in the house. Recipe ideas
   are an AI feature and follow the plan's AI setting. Pet food is tracked
   here like any other stock item.
3. Tasks. Daily and weekly chores, a cleaning schedule, an assignee per
   task, recurring tasks, and reminders. Who is responsible for what lives
   here and nowhere else.
4. Pets. A profile per pet, vaccines and vet visits, medication, grooming,
   feeding routine, and vet history.
5. Home Care. Preventive maintenance, product warranties, equipment
   upkeep, service history, and the home's documents. Documents need file
   storage, which the app does not have yet.
6. Household. Members, a shared calendar, announcements for everyone, and
   events. The calendar starts from the existing ICS feed of bills and
   recurring items.

Some things are not modules because every module uses them:

- The home screen. It greets the user, counts what needs attention
  (shopping items, bills to pay, pending tasks, pet reminders) and lists
  today's items from every module. Each module feeds it through a port, the
  way bills and recurring rules feed Upcoming today.
- Reminders. One notification engine (push today, Telegram and WhatsApp on
  plans with messaging) that every module schedules into.

Earlier announced modules fold into these six: Meals into Pantry, Todos into
Tasks, Calendar into Household. Health, Mail, and Laundry and storage are
parked.

## Positioning

- A home management app, not a chore app, a shopping list or a finance
  tracker. Each of those exists alone; Kantim is the one place for the
  whole home.
- Three principles: everything about the home in one app; the app reminds
  you of due dates, bills, tasks and needs instead of waiting to be asked;
  everyone who lives in the home can take part.
- Open source and free to self-host, with an optional hosted service. The
  hosted plans are poco's `TIER_PLANS`: they sell limits, more members,
  messaging and AI, never core features.
- Multi-currency homes are a real use case: USD, BRL and EUR accounts and
  cards side by side.

## Operating context

- One tenant per home, any number of members (the plan caps it), invite
  codes for joining.
- Planners (interest, financial independence, rent vs buy, rate
  conversion, tips) work without an account.
- Deletion is a status change everywhere except deleting the whole home:
  the owner schedules it, it waits 30 days (cancelable), then a job
  hard-deletes it in one batch. See `docs/data-export.md`.
- Runs on Cloudflare: one Worker serves the API and the web app, data in
  D1, background work on a Queue and cron triggers. Exports are built in
  memory.
- The web app is an installable PWA. The landing page is static and has no
  API.

## Capabilities and constraints

- Finance: transactions grouped by day with daily totals and month
  filtering; balances stay correct through transfers; card bills are
  derived on read; recurring rules post on schedule; limits per category
  per day, week, month or year; goals tied to a savings account.
- Presets (transaction linkers) and receivers (person, service, merchant,
  charity) fill fields while typing.
- Auth: sign-in, sign-up, password reset with one-time codes, recovery
  codes; JWT sessions in cookies.
- Stack: Hono on Cloudflare Workers, Drizzle on D1 (API); React, Vite,
  TanStack Router, Query and Table, react-hook-form, i18next (web); shadcn/ui
  on base-ui with Tailwind (UI); npm workspaces and Turborepo.
- Every user-facing string goes through the locale files: the web app has
  `en-US`, the landing page has `en-US` and `pt-BR`.

## Brand commitments

- Name: Kantim, written in lowercase in the logo ("kantim."). It comes from
  "meu cantim", the informal, affectionate Brazilian way of saying "meu
  cantinho": my own little place, where the routine happens and where people
  live with the ones they love. The K keeps the sound and makes the name
  ownable: "Cantin" sat one letter from a registered CANTINA software mark
  in Brazil and had its .com and .com.br taken, while Kantim had no conflicting mark and
  `kantim.app` and `kantim.com.br` were free (issue #30). The app is the
  digital version of that place, where each person looks after their kantim.
- Before money goes into identity, domain or store listings, the name's
  trademark and app store availability must be checked.
- Tagline (pt-BR): "Tudo do seu kantim, em um só lugar." In English:
  "Everything about your home, in one place." The English line is
  provisional; "kantim" does not translate, so the name stays as is in
  every locale.
- Brand line: "Seu cantinho, do seu jeito." Sign-off for campaigns: "Seu
  mundo começa em casa."
- Other approved slogans for marketing: "Cuide do seu kantim. Viva
  melhor.", "Seu lar no seu ritmo.", "Porque todo kantim merece cuidado.",
  "A vida acontece no seu kantim.", "Mais cuidado, menos preocupação."
- Personality: welcoming, contemporary, Brazilian, human.
- Voice: plain, warm and concrete. Short sentences that name the actual
  thing ("a conta de luz", "o leite"), never feature jargon. Portuguese is
  the brand's home language; English copy keeps the same warmth without
  forcing Brazilian slang on English readers.
- Infrastructure identifiers (Worker, D1 and queue names, cookie names,
  `OPENHOUSE_*` variables) keep the old name until a planned migration
  changes them; renaming them blindly signs everyone out or deploys a new
  Worker.

## Evidence on hand

- A working monorepo (API, web app, landing page, shared packages) with the
  Finance module implemented.
- `docs/data-export.md` documents export and deletion.
- No testimonials, customer logos, benchmarks or user counts exist. Do not
  invent any.

## Product principles

1. The home belongs to everyone in it. Every surface assumes several people
   may look at the same data, and still works for one.
2. Balances never lie. Correct balances through every operation, transfers
   included, outrank convenience.
3. Remind, don't just record. A module is done when it tells the home what
   needs attention, not when it stores the data.
4. Self-hosting is first class. Free self-host parity is a promise.
5. Planned is not live. The landing page and the app never present a
   planned module as available.

## Accessibility and inclusion

- Light and dark themes are first class (no-flash theme boot, per-scheme
  theme-color meta).
- Localization is wired end to end with i18next and a locale switcher.

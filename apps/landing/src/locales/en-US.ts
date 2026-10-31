import {
  ArrowsLeftRight,
  Bank,
  Calculator,
  CalendarCheck,
  CreditCard,
  Gauge,
  House,
  Lightbulb,
  ListChecks,
  PawPrint,
  Percent,
  Plant,
  Repeat,
  ShoppingCart,
  Target,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import type { Content } from '@/lib/content.js'
import { GITHUB_URL, SIGN_IN_URL, SIGN_UP_URL } from '@/lib/links.js'

export const enUS: Content = {
  meta: {
    title: 'Kantim | Your home, looked after',
    description:
      'Kantim is your home’s assistant. It keeps your money, bills, health, family, pets, tasks, upkeep and food in one place, and it remembers what’s due so you don’t have to. Free to start, open source, and free forever if you host it yourself.',
  },

  navLinks: [
    { label: 'Why', href: '#why' },
    { label: 'Your home', href: '#the-house' },
    { label: 'Features', href: '#features' },
    { label: 'Planners', href: '#planners' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Questions', href: '#faq' },
  ],

  navActions: {
    signIn: { label: 'Sign in', href: SIGN_IN_URL },
    start: { label: 'Start free', href: SIGN_UP_URL },
    themeToggle: 'Toggle dark theme',
    localeToggle: 'View in Portuguese',
  },

  hero: {
    headline: 'Your home, looked after.',
    tagline:
      'Kantim is your home’s assistant. It keeps your money, bills, health, family, pets, tasks, upkeep and food in one place. It remembers what’s due and what’s running low, so you don’t have to.',
    primary: { label: 'Start free', href: SIGN_UP_URL },
    secondary: { label: 'Host it yourself', href: GITHUB_URL },
    stack: 'Free plan, no credit card. Open source on GitHub.',
    windowTitle: 'kantim · Transactions',
    balance: { label: 'Checking · Main Street Bank', amount: '$8,412.36' },
    limitsTitle: 'Limits · October',
  },

  sampleLedger: [
    {
      day: 'Today',
      rows: [
        {
          description: 'Weekly groceries',
          category: 'Food',
          amount: '−$84.20',
        },
        {
          description: 'City Power',
          category: 'Utilities',
          amount: '−$112.00',
        },
      ],
    },
    {
      day: 'Thu, Oct 15',
      rows: [
        {
          description: 'Salary',
          category: 'Income',
          amount: '+$4,200.00',
          income: true,
        },
        {
          description: 'Monthly rent',
          category: 'Housing',
          amount: '−$1,450.00',
        },
      ],
    },
  ],

  sampleLimits: [
    { label: 'Groceries', spent: '$486', cap: '$600', percent: 81 },
    { label: 'Transport', spent: '$94', cap: '$250', percent: 38 },
    { label: 'Dining out', spent: '$132', cap: '$300', percent: 44 },
  ],

  sampleTotals: [
    { label: 'October · In', amount: '+$4,200.00', income: true },
    { label: 'October · Out', amount: '−$1,646.20', income: false },
  ],

  sampleAccounts: [
    {
      name: 'Main Street Checking',
      kind: 'Bank',
      amount: '$8,412.36',
      currency: 'USD',
    },
    {
      name: 'Nubank Mastercard',
      kind: 'Card · due Nov 10',
      amount: 'R$ 1.208,90',
      currency: 'BRL',
    },
    {
      name: 'Lisbon Savings',
      kind: 'Bank',
      amount: '€2,340.00',
      currency: 'EUR',
    },
  ],

  sampleGoal: {
    name: 'Emergency fund',
    progress: '$6,800 of $10,000',
    account: 'High-yield savings',
  },

  sampleHousehold: { inviteLabel: 'Invite code', code: 'OAK-4721' },

  sampleLinker: {
    descriptionLabel: 'Description',
    description: 'Monthly rent',
    category: 'Housing',
    receiver: 'Oak Street Rentals',
    receiverKind: 'Service',
  },

  sampleRules: [
    { name: 'Monthly rent', when: 'Nov 1', posted: true },
    { name: 'Streaming plan', when: 'Nov 4', posted: false },
    { name: 'City Power', when: 'Nov 12', posted: false },
  ],

  ruleStatus: { posted: 'Posted', scheduled: 'Scheduled' },

  problemsIntro: {
    eyebrow: 'Why Kantim',
    title:
      'A home runs on hundreds of small things. Most of them live in someone’s head.',
    lede: 'The bills sit in one app, the groceries on a sticky note, the vet visit in a group chat, and the chores nowhere at all. Kantim gathers all of it in one place and keeps it current, so nothing depends on who remembered.',
  },

  problems: [
    {
      icon: CreditCard,
      tone: 'red',
      pain: 'The bill was due yesterday, and nobody remembered.',
      fix: 'Every bill has a due date and a reminder a few days before it. Card bills add up as you spend, so the total is never a surprise.',
    },
    {
      icon: ShoppingCart,
      tone: 'yellow',
      pain: 'Two people bought milk, and the detergent ran out again.',
      fix: 'The pantry shows what’s on hand, what’s running low and what’s about to expire. The shopping list is always up to date.',
    },
    {
      icon: PawPrint,
      tone: 'blue',
      pain: 'The vaccine was due last month, and nobody noticed.',
      fix: 'Each pet has its own record: vaccines, vet visits, medication and feeding. Upcoming vet dates and doses reach you before they’re late.',
    },
    {
      icon: ListChecks,
      tone: 'green',
      pain: 'The chores live in one person’s head.',
      fix: 'Every task has an owner, a due date and a reminder, so everyone in the home knows what’s theirs and what’s left.',
    },
  ],

  houseIntro: {
    eyebrow: 'The whole home',
    title: 'One assistant for everything your home needs.',
    lede: 'Kantim comes from “meu cantinho,” the affectionate Brazilian way of saying “my little corner.” It’s the place where daily life happens and where you live with the people you love. Kantim looks after all of it, for one person or for the whole family.',
  },

  houseModules: [
    {
      name: 'Money',
      kind: 'Your wealth',
      description:
        'Accounts and cards in dollars, reais or euros, budgets, savings goals and the expenses everyone shares.',
      tone: 'green',
    },
    {
      name: 'Bills',
      kind: 'On time',
      description:
        'Rent, power, water, subscriptions and card bills, each with a reminder before it’s due.',
      tone: 'yellow',
    },
    {
      name: 'Health',
      kind: 'Wellbeing',
      description:
        'Appointments, medication and records for everyone in the house.',
      tone: 'red',
    },
    {
      name: 'Family',
      kind: 'Together',
      description:
        'A shared calendar, announcements for everyone, and events that matter to each member.',
      tone: 'blue',
    },
    {
      name: 'Pets',
      kind: 'Care',
      description:
        'Vaccines, vet visits, medication, grooming and feeding routines for every pet.',
      tone: 'yellow',
    },
    {
      name: 'Tasks',
      kind: 'The to-do list',
      description:
        'Daily and weekly chores, a cleaning schedule, and an owner for every task.',
      tone: 'green',
    },
    {
      name: 'Home care',
      kind: 'Upkeep',
      description:
        'Preventive maintenance, warranties, service history and the home’s documents, so the boiler gets serviced before it breaks.',
      tone: 'red',
    },
    {
      name: 'Food',
      kind: 'The pantry',
      description:
        'What’s in the cupboards and the fridge, expiry dates, the shopping list, and meal ideas from what you already have.',
      tone: 'blue',
    },
    {
      name: 'Reminders',
      kind: 'The nudge',
      description:
        'One reminder system for every area of the home, sent in the app and, on plans with messaging, in Telegram and WhatsApp.',
      tone: 'yellow',
    },
  ],

  featuresIntro: {
    eyebrow: 'How it works',
    title: 'Set it up once. Then the home keeps itself up to date.',
    lede: 'Kantim does the bookkeeping and the remembering, so you can get on with your day.',
  },

  features: {
    transactions: {
      key: 'transactions',
      tone: 'blue',
      icon: ArrowsLeftRight,
      title: 'Everything that moved, day by day',
      body: 'See what went out and came in each day, with the day’s totals. Filter by month and watch every balance change as money moves.',
    },
    accounts: {
      key: 'accounts',
      tone: 'yellow',
      icon: Wallet,
      title: 'Every account and card, side by side',
      body: 'Checking, savings and credit cards in one view, each with its closing and due dates. Accounts can be in US dollars, reais or euros.',
    },
    recurring: {
      key: 'recurring',
      tone: 'green',
      icon: Repeat,
      title: 'Bills that record themselves',
      body: 'Tell Kantim the rent is due on the 1st. It’s recorded every month, and you get a reminder before it’s due.',
    },
    limits: {
      key: 'limits',
      tone: 'red',
      icon: Gauge,
      title: 'Spending limits that warn you early',
      body: 'Set a cap for groceries or eating out per day, week, month or year, and see how close you are before you go over.',
    },
    goals: {
      key: 'goals',
      tone: 'green',
      icon: Target,
      title: 'Savings goals you can see',
      body: 'Pick a savings account and a target. The goal fills up as the money grows.',
    },
    household: {
      key: 'household',
      tone: 'blue',
      icon: UsersThree,
      title: 'One home, every member',
      body: 'Partners, kids and housemates sign in to the same home and see the same bills, tasks and balances. New members join with an invite code.',
    },
    linkers: {
      key: 'linkers',
      tone: 'yellow',
      icon: CalendarCheck,
      title: 'Less typing',
      body: 'Type “Monthly rent” and the category and payee fill in for you. Each payee is marked as a person, a service, a store or a charity.',
    },
  },

  plannersIntro: {
    eyebrow: 'Planners',
    title: 'Run the numbers before you decide.',
    lede: 'Calculators for the big decisions of the home. They work without an account and never touch your books: change a number and see what happens over the next twenty years.',
  },

  planners: [
    {
      icon: Percent,
      tone: 'blue',
      title: 'Simple vs compound interest',
      body: 'How the same money grows when interest is paid only on what you put in, and when it is paid on the interest too.',
    },
    {
      icon: Calculator,
      tone: 'yellow',
      title: 'Rate conversion',
      body: 'Turn a yearly rate into a monthly or business-day rate the right way, by compounding instead of dividing.',
    },
    {
      icon: Plant,
      tone: 'green',
      title: 'Financial independence',
      body: 'How much to set aside each month to reach a target, and how much that balance pays you once you stop.',
    },
    {
      icon: House,
      tone: 'red',
      title: 'Buy or rent',
      body: 'Compare financing a home with renting and investing the difference, month by month.',
    },
    {
      icon: Lightbulb,
      tone: 'yellow',
      title: 'Money tips',
      body: 'Short guides on the six jars method, saving habits and a way to organize the home’s finances. No account needed.',
    },
  ],

  pricingIntro: {
    eyebrow: 'Pricing',
    title: 'Start free. Pay when your home grows.',
    lede: 'Every plan gets the whole app. Paid plans add room for more accounts, members and history, plus messaging and AI. Hosted prices are per month, in Brazilian reais. Hosting it yourself costs nothing.',
  },

  selfHosted: {
    badge: 'Free · Self-hosted',
    name: 'Host it yourself',
    tagline:
      'The whole app with no limits, on your own Cloudflare account. Clone the code, run one command, and your home’s data stays with you.',
    price: '$0',
    priceNote: 'free forever, open source',
    perks: [
      { label: 'Every area of the home, with no caps on accounts or history' },
      { label: 'Your own D1 database and your own backups' },
      { label: 'One deploy command, running in minutes' },
      { label: 'Community help on GitHub' },
    ],
    commands: [
      `git clone ${GITHUB_URL}.git`,
      'cd Kantim && npm install',
      'npx wrangler login && npm run deploy',
    ],
    cta: { label: 'Get it on GitHub', href: GITHUB_URL },
  },

  hostedPlans: [
    {
      name: 'Free',
      tagline: 'For one person getting started.',
      price: 'R$0',
      priceNote: 'per month',
      perks: [
        { label: 'Every area of the home, from money to pets' },
        {
          label:
            'Up to 2 accounts, categories, limits, goals and recurring bills',
        },
        { label: 'The last 3 months of transactions' },
        { label: '1 statement import and 1 export a month' },
        { label: 'Every planner and guide' },
        { label: 'Household members', included: false },
        { label: 'Signed in on several devices at once', included: false },
      ],
      cta: { label: 'Start free', href: SIGN_UP_URL },
    },
    {
      name: 'Plus',
      tagline: 'For a household that runs its home here.',
      price: 'R$15',
      priceNote: 'per month, plus R$2 per extra member',
      perks: [
        { label: 'Invite everyone in the house' },
        {
          label:
            'Up to 10 accounts, categories, limits, goals and recurring bills',
        },
        { label: 'Your full transaction history' },
        { label: '5 statement imports and 5 exports a month' },
        { label: 'Every planner and guide' },
        { label: 'Signed in on several devices at once', included: false },
      ],
      cta: { label: 'Join early access', href: SIGN_UP_URL },
      featured: true,
    },
    {
      name: 'Pro',
      tagline: 'Plus, with chat apps and AI.',
      price: 'R$30',
      priceNote: 'per month, plus R$2 per extra member',
      perks: [
        { label: 'Everything in Plus' },
        { label: 'Signed in on several devices at once' },
        { label: 'Telegram and WhatsApp updates (coming soon)' },
        { label: 'AI features with a usage limit (coming soon)' },
        { label: 'Household assistant', included: false },
      ],
      cta: { label: 'Join early access', href: SIGN_UP_URL },
    },
    {
      name: 'Max',
      tagline: 'Everything, including the household assistant.',
      price: 'R$40',
      priceNote: 'per month, plus R$2 per extra member',
      perks: [
        { label: 'Everything in Pro' },
        { label: 'Household assistant (coming soon)' },
      ],
      cta: { label: 'Join early access', href: SIGN_UP_URL },
    },
  ],

  featuredBadge: 'Best for households',

  faqIntro: {
    eyebrow: 'Questions',
    title: 'Before you move your home in.',
  },

  faq: [
    {
      question: 'Is it only for money?',
      answer:
        'No. Kantim covers the whole home: money and bills, health, family, pets, tasks, upkeep and food. Everything shares one sign-in and one set of members, so it all works together.',
    },
    {
      question: 'Do I need a family to use it?',
      answer:
        'No. Kantim works for one person living alone, a couple, a family or a shared flat. A home of one just skips the shared parts.',
    },
    {
      question: 'Does Kantim connect to my bank?',
      answer:
        'No. You add transactions by hand, from recurring bills, or by uploading a statement file (OFX, QFX or CSV) from your bank. The file is read once and not stored, and an import can be undone for 24 hours.',
    },
    {
      question: 'Can more than one person use the same home?',
      answer:
        'Yes, on Plus and above, and on every self-hosted install. Everyone signs in to the same home and sees the same bills, tasks and balances. New members join with an invite code. On a hosted plan, each extra member is R$2 a month.',
    },
    {
      question: 'Is it really free to host it myself?',
      answer:
        'Yes. Self-hosting costs nothing and has every feature with no limits. Clone the repository, run npm run deploy, and it runs on your own Cloudflare account with your own database.',
    },
    {
      question: 'Where does my data live?',
      answer:
        'If you host it yourself, in a D1 database on your own Cloudflare account. On a hosted plan, Kantim runs the server and handles backups and updates.',
    },
    {
      question: 'What happens to older transactions on the Free plan?',
      answer:
        'Free shows the last 3 months. Older transactions are hidden, not deleted, and they come back when you move to a paid plan.',
    },
    {
      question: 'Which currencies does it handle?',
      answer:
        'Accounts and cards can be in US dollars, reais or euros. Each account keeps its own currency, and amounts are not converted between them.',
    },
    {
      question: 'Is the hosted code different from the open-source code?',
      answer:
        'No. Every plan runs the same code. The plans differ in who runs the server and how much you can store.',
    },
  ],

  openSource: {
    eyebrow: 'Open source',
    title: 'Your home. Your server. Your code.',
    body: 'All of Kantim is on GitHub. Read the code, run it on your own account, or send a pull request when your home needs a new room.',
    points: [
      { icon: Bank, label: 'Your data in your own D1 database' },
      { icon: House, label: 'One Worker, one deploy command' },
      { icon: UsersThree, label: 'Built for one person or a whole family' },
    ],
    cta: { label: 'Star on GitHub', href: GITHUB_URL },
  },

  footer: {
    tagline: 'Everything about your home, in one place.',
    copyright: `© ${new Date().getFullYear()} CouraLabs`,
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Your home', href: '#the-house' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Sign in', href: SIGN_IN_URL },
    ],
  },
}

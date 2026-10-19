import {
  ArrowsLeftRight,
  Bank,
  Calculator,
  CalendarCheck,
  Gauge,
  House,
  type Icon,
  Lightbulb,
  Percent,
  Plant,
  Repeat,
  Target,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import { GITHUB_URL, SIGN_IN_URL, SIGN_UP_URL } from './links.js'

/**
 * Every word the page shows lives here, so the sections stay pure
 * layout and a second locale is one more file shaped like this one.
 */

/** One link in the sticky nav. */
export interface NavLink {
  label: string
  href: string
}

export const navLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Planners', href: '#planners' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Questions', href: '#faq' },
  { label: 'Open source', href: '#open-source' },
]

export const navActions = {
  signIn: { label: 'Sign in', href: SIGN_IN_URL },
  start: { label: 'Start free', href: SIGN_UP_URL },
  themeToggle: 'Toggle dark theme',
}

/** The four washed-out pastels; the only color the page spends. */
export type Tone = 'red' | 'blue' | 'green' | 'yellow'

export const hero = {
  eyebrow: 'Open source · Household finance',
  headline: 'Every coin in the house, in its place.',
  tagline:
    'OpenHouse keeps your household’s accounts, transactions, limits, and goals in one calm ledger. Open source end to end — run it on your own server for free, or let us run it for you.',
  primary: { label: 'Start free', href: SIGN_UP_URL },
  secondary: { label: 'Self-host it', href: GITHUB_URL },
  stack: 'Built on PostgreSQL, NestJS & React',
  windowTitle: 'openhouse — Transactions',
  balance: { label: 'Checking · Main Street Bank', amount: '$8,412.36' },
}

/** A row of the sample ledger the previews render. */
export interface LedgerRow {
  description: string
  category: string
  /** Signed, already formatted — the previews never do arithmetic. */
  amount: string
  income?: boolean
}

export const sampleLedger: { day: string; rows: LedgerRow[] }[] = [
  {
    day: 'Today',
    rows: [
      { description: 'Weekly groceries', category: 'Food', amount: '−$84.20' },
      { description: 'City Power', category: 'Utilities', amount: '−$112.00' },
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
]

/** One tile of the feature bento. */
export interface Feature {
  key:
    | 'transactions'
    | 'accounts'
    | 'recurring'
    | 'limits'
    | 'goals'
    | 'household'
    | 'linkers'
  icon: Icon
  tone: Tone
  title: string
  body: string
}

export const featuresIntro = {
  eyebrow: 'The ledger',
  title: 'Everything a household spends, saves, and owes.',
  lede: 'Set up your accounts once, then let the ledger stay true on its own — rules post the bills, presets fill the forms, limits and goals keep score.',
}

export const features: Record<Feature['key'], Feature> = {
  transactions: {
    key: 'transactions',
    tone: 'blue',
    icon: ArrowsLeftRight,
    title: 'Every movement, grouped by day',
    body: 'Filter by month, see the day’s totals at a glance, and keep every account balance true as money comes in and goes out.',
  },
  accounts: {
    key: 'accounts',
    tone: 'yellow',
    icon: Wallet,
    title: 'Accounts and cards',
    body: 'Bank accounts and credit cards with their balances, closing and due dates — in dollars, reais, or euros.',
  },
  recurring: {
    key: 'recurring',
    tone: 'green',
    icon: Repeat,
    title: 'Bills that post themselves',
    body: 'Recurring rules materialize the transaction on schedule, so rent and subscriptions never go unrecorded.',
  },
  limits: {
    key: 'limits',
    tone: 'red',
    icon: Gauge,
    title: 'Limits per category',
    body: 'Cap what a category may cost across a day, a week, a month, or a year — and watch the bar fill before it overflows.',
  },
  goals: {
    key: 'goals',
    tone: 'green',
    icon: Target,
    title: 'Goals with a gauge',
    body: 'Point a goal at a savings account and a target balance. The gauge fills as the account grows.',
  },
  household: {
    key: 'household',
    tone: 'blue',
    icon: UsersThree,
    title: 'One house, many hands',
    body: 'Everyone in the household signs in to the same books — new members join with an invite code.',
  },
  linkers: {
    key: 'linkers',
    tone: 'yellow',
    icon: CalendarCheck,
    title: 'Presets that fill the form',
    body: 'Type “Monthly rent” and the category and receiver fill in. Receivers know whether money went to a person, a service, a merchant, or a charity.',
  },
}

/** One calculator or guide in the planners section. */
export interface Planner {
  icon: Icon
  tone: Tone
  title: string
  body: string
}

export const plannersIntro = {
  eyebrow: 'Planners',
  title: 'Do the math before the money moves.',
  lede: 'Calculators that need no data from your ledger — open them, change a number, and see what the next twenty years look like.',
}

export const planners: Planner[] = [
  {
    icon: Percent,
    tone: 'blue',
    title: 'Simple vs compound interest',
    body: 'The same money grown two ways — on the principal only, or on the interest too.',
  },
  {
    icon: Calculator,
    tone: 'yellow',
    title: 'Rate conversion',
    body: 'Translate a rate between year, month, and business day — by compounding, never by dividing.',
  },
  {
    icon: Plant,
    tone: 'green',
    title: 'Financial independence',
    body: 'What to put away each month to reach a target, and what a balance pays out once you stop.',
  },
  {
    icon: House,
    tone: 'red',
    title: 'Buy or rent',
    body: 'Financing a property against renting and investing the difference, month by month.',
  },
  {
    icon: Lightbulb,
    tone: 'yellow',
    title: 'Financial tips',
    body: 'Short guides — the six jars, saving habits, an organizing strategy — no account required.',
  },
]

/** One perk line on a plan card; `included: false` renders it struck. */
export interface Perk {
  label: string
  included?: boolean
}

/** One hosted plan. The self-hosted plan has its own shape below. */
export interface Plan {
  name: string
  tagline: string
  price: string
  /** The line under the price — the period, or why there is no number. */
  priceNote: string
  perks: Perk[]
  cta: { label: string; href: string }
  featured?: boolean
}

export const pricingIntro = {
  eyebrow: 'Pricing',
  title: 'Four ways in. One of them is free forever.',
  lede: 'The code is the same on every plan. You choose who runs the server — and whether an assistant reads the ledger with you.',
}

export const selfHosted = {
  badge: 'Free · Self-hosted',
  name: 'Host it yourself',
  tagline:
    'Every feature, no limits, on hardware you own. Clone the repository, start the stack, and the books never leave your house.',
  price: '$0',
  priceNote: 'forever, open source',
  perks: [
    { label: 'Every feature, unlimited accounts and history' },
    { label: 'Your PostgreSQL, your data, your backups' },
    { label: 'Docker Compose stack, ready in minutes' },
    { label: 'Community support on GitHub' },
  ] satisfies Perk[],
  commands: [
    `git clone ${GITHUB_URL}.git`,
    'cd OpenHouse',
    'docker compose up --build',
  ],
  cta: { label: 'Get it on GitHub', href: GITHUB_URL },
}

export const hostedPlans: Plan[] = [
  {
    name: 'Freemium',
    tagline: 'Zero cost on our servers, sized for getting started.',
    price: '$0',
    priceNote: 'hosted by OpenHouse',
    perks: [
      { label: 'Up to 2 accounts' },
      { label: '12 months of history' },
      { label: 'Transactions, categories, limits & goals' },
      { label: 'Every planner and guide' },
      { label: 'Recurring rules & presets', included: false },
      { label: 'Household members', included: false },
    ],
    cta: { label: 'Start free', href: SIGN_UP_URL },
  },
  {
    name: 'Premium',
    tagline: 'Every feature, no limits — we keep the server running.',
    price: 'Soon',
    priceNote: 'pricing announced at launch',
    perks: [
      { label: 'Unlimited accounts and history' },
      { label: 'Recurring rules & transaction presets' },
      { label: 'Household members by invite code' },
      { label: 'Managed backups and updates' },
      { label: 'AI assistant', included: false },
    ],
    cta: { label: 'Join early access', href: SIGN_UP_URL },
  },
  {
    name: 'Premium AI',
    tagline:
      'Everything in Premium, plus an assistant that reads the ledger with you.',
    price: 'Soon',
    priceNote: 'pricing announced at launch',
    perks: [
      { label: 'Everything in Premium' },
      { label: 'Categories suggested from each description' },
      { label: 'Ask your ledger in plain language' },
      { label: 'Monthly insight summaries' },
      { label: 'Nudges before a limit overflows' },
    ],
    cta: { label: 'Join early access', href: SIGN_UP_URL },
    featured: true,
  },
]

/** One question in the FAQ; every answer restates a fact the page makes. */
export interface Question {
  question: string
  answer: string
}

export const faqIntro = {
  eyebrow: 'Questions',
  title: 'Before you move the books in.',
}

export const faq: Question[] = [
  {
    question: 'Is it really free to self-host?',
    answer:
      'Yes. The self-hosted plan is $0 forever and carries every feature with no limits. Clone the repository, run docker compose up --build, and the stack starts on your own hardware.',
  },
  {
    question: 'Where does my data live?',
    answer:
      'Self-hosted, it lives in your own PostgreSQL — your data, your backups. On a hosted plan, OpenHouse runs the server and keeps backups and updates managed for you.',
  },
  {
    question: 'Is the hosted code different from the open-source code?',
    answer:
      'No. The code is the same on every plan. What changes is who runs the server and whether an assistant reads the ledger with you.',
  },
  {
    question: 'Can more than one person use the same books?',
    answer:
      'Yes. Everyone in the household signs in to the same ledger, and new members join with an invite code. Household members are part of Premium and of every self-hosted install.',
  },
  {
    question: 'Which currencies does it handle?',
    answer:
      'Accounts and cards can be kept in dollars, reais, or euros, each with its own balance and, for cards, closing and due dates.',
  },
]

export const openSource = {
  eyebrow: 'Open source',
  title: 'Your house. Your server. Your code.',
  body: 'OpenHouse is built in the open. Read every line, run it on your own machine, and send a pull request when the house needs a new room.',
  points: [
    { icon: Bank, label: 'PostgreSQL-backed, schema in the repo' },
    { icon: House, label: 'One Docker Compose stack' },
    { icon: UsersThree, label: 'Multi-member households built in' },
  ],
  cta: { label: 'Star on GitHub', href: GITHUB_URL },
}

export const footer = {
  tagline: 'Open-source household finance.',
  copyright: `© ${new Date().getFullYear()} CouraLabs`,
  links: [
    { label: 'GitHub', href: GITHUB_URL },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Sign in', href: SIGN_IN_URL },
  ],
}

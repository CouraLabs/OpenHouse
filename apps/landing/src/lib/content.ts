import type { Icon } from '@phosphor-icons/react'

/**
 * The shape of every word the page shows. Each locale in `src/locales/` is
 * one `Content` object, so the sections stay pure layout and a missing
 * translation is a type error, not a blank on the page.
 */

/** A labeled destination: nav links, footer links, calls to action. */
export interface NavLink {
  label: string
  href: string
}

/** The four washed-out pastels; the only color the page spends. */
export type Tone = 'red' | 'blue' | 'green' | 'yellow' | 'bone'

/** A section's kicker, serif title, and optional lede. */
export interface Intro {
  eyebrow: string
  title: string
  lede?: string
}

/** A row of the sample ledger the previews render. */
export interface LedgerRow {
  description: string
  category: string
  /** Signed, already formatted — the previews never do arithmetic. */
  amount: string
  income?: boolean
}

/** One day of the sample ledger. */
export interface LedgerDay {
  day: string
  rows: LedgerRow[]
}

/** A sample category limit; amounts already formatted. */
export interface SampleLimit {
  label: string
  spent: string
  cap: string
  percent: number
}

/** One of the month's sample totals under the transactions card. */
export interface SampleTotal {
  label: string
  amount: string
  income: boolean
}

/** A sample account in the accounts card, one per currency. */
export interface SampleAccount {
  name: string
  kind: string
  amount: string
  currency: string
}

/** A sample recurring rule; the first is already posted. */
export interface SampleRule {
  name: string
  when: string
  posted: boolean
}

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

/** One calculator or guide in the planners section. */
export interface Planner {
  icon: Icon
  tone: Tone
  title: string
  body: string
}

/** One row of the house index: a module of the shared home and its status. */
export interface HouseModule {
  name: string
  /** The domain's kind, shown as a wash tag — the room of the house it is. */
  kind: string
  description: string
  tone: Tone
  /** `live` renders the green Live badge; `coming` the quiet one. */
  status: 'live' | 'coming'
}

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
  cta: NavLink
  featured?: boolean
}

/** The free self-hosted plan: a plan plus the commands that start it. */
export interface SelfHostedPlan {
  badge: string
  name: string
  tagline: string
  price: string
  priceNote: string
  perks: Perk[]
  commands: string[]
  cta: NavLink
}

/** One question in the FAQ; every answer restates a fact the page makes. */
export interface Question {
  question: string
  answer: string
}

/** Everything one locale says, section by section in reading order. */
export interface Content {
  /** The tab title and the description meta tag. */
  meta: { title: string; description: string }
  navLinks: NavLink[]
  navActions: {
    signIn: NavLink
    start: NavLink
    themeToggle: string
    /** The locale toggle's accessible name, phrased as the switch it makes. */
    localeToggle: string
  }
  hero: {
    eyebrow: string
    headline: string
    tagline: string
    primary: NavLink
    secondary: NavLink
    stack: string
    windowTitle: string
    balance: { label: string; amount: string }
    limitsTitle: string
  }
  /** The house index: the ledger live today, the announced rooms on the way. */
  houseIntro: Intro
  houseStatus: { live: string; coming: string }
  houseModules: HouseModule[]
  sampleLedger: LedgerDay[]
  sampleLimits: SampleLimit[]
  sampleTotals: SampleTotal[]
  sampleAccounts: SampleAccount[]
  sampleGoal: { name: string; progress: string; account: string }
  sampleHousehold: { inviteLabel: string; code: string }
  sampleLinker: {
    descriptionLabel: string
    description: string
    category: string
    receiver: string
    receiverKind: string
  }
  sampleRules: SampleRule[]
  ruleStatus: { posted: string; scheduled: string }
  featuresIntro: Intro
  features: Record<Feature['key'], Feature>
  plannersIntro: Intro
  planners: Planner[]
  pricingIntro: Intro
  selfHosted: SelfHostedPlan
  hostedPlans: Plan[]
  featuredBadge: string
  faqIntro: Intro
  faq: Question[]
  openSource: {
    eyebrow: string
    title: string
    body: string
    points: { icon: Icon; label: string }[]
    cta: NavLink
  }
  footer: { tagline: string; copyright: string; links: NavLink[] }
}

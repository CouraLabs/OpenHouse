import type { Icon } from '@phosphor-icons/react'

export interface NavLink {
  label: string
  href: string
}

export type Tone = 'red' | 'blue' | 'green' | 'yellow' | 'bone'

export interface Intro {
  eyebrow: string
  title: string
  lede?: string
}

export interface LedgerRow {
  description: string
  category: string
  amount: string
  income?: boolean
}

export interface LedgerDay {
  day: string
  rows: LedgerRow[]
}

export interface SampleLimit {
  label: string
  spent: string
  cap: string
  percent: number
}

export interface SampleTotal {
  label: string
  amount: string
  income: boolean
}

export interface SampleAccount {
  name: string
  kind: string
  amount: string
  currency: string
}

export interface SampleRule {
  name: string
  when: string
  posted: boolean
}

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

export interface Planner {
  icon: Icon
  tone: Tone
  title: string
  body: string
}

export interface Problem {
  icon: Icon
  tone: Tone
  pain: string
  fix: string
}

export interface HouseModule {
  name: string
  kind: string
  description: string
  tone: Tone
  status: 'live' | 'coming'
}

export interface Perk {
  label: string
  included?: boolean
}

export interface Plan {
  name: string
  tagline: string
  price: string
  priceNote: string
  perks: Perk[]
  cta: NavLink
  featured?: boolean
}

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

export interface Question {
  question: string
  answer: string
}

export interface Content {
  meta: { title: string; description: string }
  navLinks: NavLink[]
  navActions: {
    signIn: NavLink
    start: NavLink
    themeToggle: string
    localeToggle: string
  }
  hero: {
    headline: string
    tagline: string
    primary: NavLink
    secondary: NavLink
    stack: string
    windowTitle: string
    balance: { label: string; amount: string }
    limitsTitle: string
  }
  problemsIntro: Intro
  problems: Problem[]
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

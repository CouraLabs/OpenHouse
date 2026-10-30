import {
  ArrowsLeftRight,
  Bank,
  Calculator,
  CalendarCheck,
  CreditCard,
  FileArrowUp,
  Gauge,
  House,
  Lightbulb,
  Percent,
  Plant,
  Repeat,
  Target,
  TrendDown,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import type { Content } from '@/lib/content.js'
import { GITHUB_URL, SIGN_IN_URL, SIGN_UP_URL } from '@/lib/links.js'

export const enUS: Content = {
  meta: {
    title: 'OpenHouse | Household money, shared',
    description:
      'OpenHouse keeps every account and credit card your household uses in one shared ledger. It records the recurring bills, adds up each card bill as you spend, and reminds you before anything is due. Free to start, open source, and free forever if you host it yourself.',
  },

  navLinks: [
    { label: 'Why', href: '#why' },
    { label: 'Features', href: '#features' },
    { label: 'Planners', href: '#planners' },
    { label: 'What’s next', href: '#the-house' },
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
    headline: 'Know what the house owes before the bill arrives.',
    tagline:
      'OpenHouse puts every account and credit card your household uses in one ledger that everyone at home can see. It records the rent and subscriptions for you, adds up each card bill as you spend, and reminds you a few days before anything is due.',
    primary: { label: 'Start free', href: SIGN_UP_URL },
    secondary: { label: 'Host it yourself', href: GITHUB_URL },
    stack: 'Free plan, no credit card. The code is open on GitHub.',
    windowTitle: 'openhouse · Transactions',
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
    eyebrow: 'Why OpenHouse',
    title: 'Household money goes wrong in the same few ways.',
    lede: 'The numbers usually live in one person’s head, a spreadsheet nobody updates, and three or four banking apps. OpenHouse brings them into one place and keeps them current.',
  },

  problems: [
    {
      icon: CreditCard,
      tone: 'red',
      pain: 'The card bill is bigger than anyone expected.',
      fix: 'Every charge lands on the bill it belongs to, so you see the running total all month. A reminder arrives a few days before the due date.',
    },
    {
      icon: TrendDown,
      tone: 'yellow',
      pain: 'An account dips below zero and the bank tells you first.',
      fix: 'The Upcoming page projects your balances from scheduled bills and card payments, and shows the date an account would go negative.',
    },
    {
      icon: FileArrowUp,
      tone: 'blue',
      pain: 'The budget spreadsheet lasted two weeks.',
      fix: 'Upload your bank’s OFX, QFX or CSV statement and the transactions come in. Rent and subscriptions record themselves every month.',
    },
    {
      icon: UsersThree,
      tone: 'green',
      pain: 'Only one person knows where the money stands.',
      fix: 'Everyone in the house signs in to the same books and sees the same balances, limits and goals. New members join with an invite code.',
    },
  ],

  houseIntro: {
    eyebrow: 'What’s next',
    title: 'Money is the first room. More are on the way.',
    lede: 'OpenHouse is growing into one app for running the home. Each new part will use the same sign-in and the same household members.',
  },

  houseStatus: { live: 'Available now', coming: 'Planned' },

  houseModules: [
    {
      name: 'Money',
      kind: 'The ledger',
      description: 'Accounts, cards, bills, transactions, limits and goals.',
      tone: 'green',
      status: 'live',
    },
    {
      name: 'Pantry',
      kind: 'The cupboards',
      description: 'What’s in the cupboards, what’s running out, what to buy.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'Meals',
      kind: 'The table',
      description: 'Plan the week’s meals from what’s in the pantry.',
      tone: 'red',
      status: 'coming',
    },
    {
      name: 'Laundry & storage',
      kind: 'The closets',
      description: 'Where things are kept and what’s clean.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Pets',
      kind: 'The animals',
      description: 'Feeding, vet appointments and each pet’s records.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'Health',
      kind: 'Wellbeing',
      description: 'Appointments, medications and the family’s records.',
      tone: 'red',
      status: 'coming',
    },
    {
      name: 'Todos',
      kind: 'The list',
      description: 'One to-do list the whole house can see.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Calendar',
      kind: 'The dates',
      description: 'One calendar for the whole house.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'Mail',
      kind: 'The letters',
      description: 'Household mail, connected to your inboxes.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Telegram & WhatsApp',
      kind: 'The conversations',
      description: 'Reminders and updates in the chat apps you already use.',
      tone: 'red',
      status: 'coming',
    },
  ],

  featuresIntro: {
    eyebrow: 'Features',
    title: 'What the house spends, saves and owes, in one ledger.',
    lede: 'Set up your accounts once. After that, most of the bookkeeping happens without you.',
  },

  features: {
    transactions: {
      key: 'transactions',
      tone: 'blue',
      icon: ArrowsLeftRight,
      title: 'Every transaction, day by day',
      body: 'See what went out each day with the day’s totals, filter by month, and watch each balance update as money comes in and goes out.',
    },
    accounts: {
      key: 'accounts',
      tone: 'yellow',
      icon: Wallet,
      title: 'Bank accounts and cards',
      body: 'Checking, savings and credit cards side by side, with each card’s closing and due dates. Accounts can be in US dollars, reais or euros.',
    },
    recurring: {
      key: 'recurring',
      tone: 'green',
      icon: Repeat,
      title: 'Bills that record themselves',
      body: 'Tell OpenHouse the rent is due on the 1st and it records the payment every month, so nothing goes missing from the books.',
    },
    limits: {
      key: 'limits',
      tone: 'red',
      icon: Gauge,
      title: 'Spending limits',
      body: 'Set a cap for groceries or dining out per day, week, month or year, and see how close you are before you go over.',
    },
    goals: {
      key: 'goals',
      tone: 'green',
      icon: Target,
      title: 'Savings goals',
      body: 'Pick a savings account and a target balance. The goal fills as the account grows.',
    },
    household: {
      key: 'household',
      tone: 'blue',
      icon: UsersThree,
      title: 'Shared with the house',
      body: 'Partners and family sign in to the same books. New members join with an invite code.',
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
    lede: 'Calculators for the big money questions. They don’t touch your ledger: change a number and see what happens over the next twenty years.',
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
      body: 'Short guides on the six jars method, saving habits and a way to organize your finances. No account needed.',
    },
  ],

  pricingIntro: {
    eyebrow: 'Pricing',
    title: 'Start free. Pay when the house needs more.',
    lede: 'Every plan runs the same code. Hosted prices are per month, in Brazilian reais. Hosting it yourself costs nothing.',
  },

  selfHosted: {
    badge: 'Free · Self-hosted',
    name: 'Host it yourself',
    tagline:
      'Every feature with no limits, on your own Cloudflare account. Clone the code, run one command, and your data stays on your account.',
    price: '$0',
    priceNote: 'free forever, open source',
    perks: [
      { label: 'Every feature, no caps on accounts or history' },
      { label: 'Your own D1 database and your own backups' },
      { label: 'One deploy command, running in minutes' },
      { label: 'Community help on GitHub' },
    ],
    commands: [
      `git clone ${GITHUB_URL}.git`,
      'cd OpenHouse && npm install',
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
      tagline: 'For a household that keeps its books here.',
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
    title: 'Before you move the books in.',
  },

  faq: [
    {
      question: 'Does OpenHouse connect to my bank?',
      answer:
        'No. You add transactions by hand, from recurring bills, or by uploading a statement file (OFX, QFX or CSV) from your bank. The file is read once and not stored, and an import can be undone for 24 hours.',
    },
    {
      question: 'Is it really free to host it myself?',
      answer:
        'Yes. Self-hosting costs nothing and has every feature with no limits. Clone the repository, run npm run deploy, and it runs on your own Cloudflare account with your own database.',
    },
    {
      question: 'Where does my data live?',
      answer:
        'If you host it yourself, in a D1 database on your own Cloudflare account. On a hosted plan, OpenHouse runs the server and handles backups and updates.',
    },
    {
      question: 'Can more than one person use the same books?',
      answer:
        'Yes, on Plus and above, and on every self-hosted install. Everyone signs in to the same ledger, and new members join with an invite code. Each extra member is R$2 a month on a hosted plan.',
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
    {
      question: 'What comes after the money?',
      answer:
        'Pantry, meals, todos, pets, health, calendar, mail and Telegram and WhatsApp are planned. Each will join the same app with the same sign-in and members, and the money side keeps working as it does today.',
    },
  ],

  openSource: {
    eyebrow: 'Open source',
    title: 'Your house. Your server. Your code.',
    body: 'All of OpenHouse is on GitHub. Read the code, run it on your own account, or send a pull request when the house needs a new room.',
    points: [
      { icon: Bank, label: 'Data in your own D1 database' },
      { icon: House, label: 'One Worker, one deploy command' },
      { icon: UsersThree, label: 'Households with several members' },
    ],
    cta: { label: 'Star on GitHub', href: GITHUB_URL },
  },

  footer: {
    tagline: 'Household money, shared.',
    copyright: `© ${new Date().getFullYear()} CouraLabs`,
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Sign in', href: SIGN_IN_URL },
    ],
  },
}

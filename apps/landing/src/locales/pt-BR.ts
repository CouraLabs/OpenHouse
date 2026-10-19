import {
  ArrowsLeftRight,
  Bank,
  Calculator,
  CalendarCheck,
  Gauge,
  House,
  Lightbulb,
  Percent,
  Plant,
  Repeat,
  Target,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import type { Content } from '@/lib/content.js'
import { GITHUB_URL, SIGN_IN_URL, SIGN_UP_URL } from '@/lib/links.js'

/** The page in Brazilian Portuguese; samples read in reais and Brazilian dates. */
export const ptBR: Content = {
  meta: {
    title: 'OpenHouse — finanças da casa, em código aberto',
    description:
      'OpenHouse é um app de finanças domésticas de código aberto: contas, transações, limites, metas e planejadores — hospede você mesmo de graça ou deixe que a gente rode para você.',
  },

  navLinks: [
    { label: 'Recursos', href: '#features' },
    { label: 'Planejadores', href: '#planners' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Dúvidas', href: '#faq' },
    { label: 'Código aberto', href: '#open-source' },
  ],

  navActions: {
    signIn: { label: 'Entrar', href: SIGN_IN_URL },
    start: { label: 'Comece grátis', href: SIGN_UP_URL },
    themeToggle: 'Alternar tema escuro',
    localeToggle: 'View in English',
  },

  hero: {
    eyebrow: 'Código aberto · Finanças da casa',
    headline: 'Cada centavo da casa, no seu lugar.',
    tagline:
      'O OpenHouse reúne as contas, transações, limites e metas da sua casa em um livro-caixa tranquilo. Código aberto de ponta a ponta — rode no seu próprio servidor de graça, ou deixe que a gente rode para você.',
    primary: { label: 'Comece grátis', href: SIGN_UP_URL },
    secondary: { label: 'Hospede você mesmo', href: GITHUB_URL },
    stack: 'Feito com PostgreSQL, NestJS e React',
    windowTitle: 'openhouse — Transações',
    balance: {
      label: 'Conta corrente · Banco da Praça',
      amount: 'R$ 8.412,36',
    },
    limitsTitle: 'Limites · Outubro',
  },

  sampleLedger: [
    {
      day: 'Hoje',
      rows: [
        {
          description: 'Mercado da semana',
          category: 'Alimentação',
          amount: '−R$ 84,20',
        },
        {
          description: 'Conta de luz',
          category: 'Contas da casa',
          amount: '−R$ 112,00',
        },
      ],
    },
    {
      day: 'Qui, 15 out',
      rows: [
        {
          description: 'Salário',
          category: 'Receitas',
          amount: '+R$ 4.200,00',
          income: true,
        },
        {
          description: 'Aluguel do mês',
          category: 'Moradia',
          amount: '−R$ 1.450,00',
        },
      ],
    },
  ],

  sampleLimits: [
    { label: 'Mercado', spent: 'R$ 486', cap: 'R$ 600', percent: 81 },
    { label: 'Transporte', spent: 'R$ 94', cap: 'R$ 250', percent: 38 },
    { label: 'Restaurantes', spent: 'R$ 132', cap: 'R$ 300', percent: 44 },
  ],

  sampleTotals: [
    { label: 'Outubro · Entradas', amount: '+R$ 4.200,00', income: true },
    { label: 'Outubro · Saídas', amount: '−R$ 1.646,20', income: false },
  ],

  sampleAccounts: [
    {
      name: 'Banco da Praça',
      kind: 'Conta corrente',
      amount: 'R$ 8.412,36',
      currency: 'BRL',
    },
    {
      name: 'Cartão internacional',
      kind: 'Cartão · vence 10 nov',
      amount: 'US$ 412,90',
      currency: 'USD',
    },
    {
      name: 'Poupança em Lisboa',
      kind: 'Banco',
      amount: '€ 2.340,00',
      currency: 'EUR',
    },
  ],

  sampleGoal: {
    name: 'Reserva de emergência',
    progress: 'R$ 6.800 de R$ 10.000',
    account: 'Conta de investimento',
  },

  sampleHousehold: { inviteLabel: 'Código de convite', code: 'OAK-4721' },

  sampleLinker: {
    descriptionLabel: 'Descrição',
    description: 'Aluguel do mês',
    category: 'Moradia',
    receiver: 'Imobiliária Ipê',
    receiverKind: 'Serviço',
  },

  sampleRules: [
    { name: 'Aluguel do mês', when: '1 nov', posted: true },
    { name: 'Streaming', when: '4 nov', posted: false },
    { name: 'Conta de luz', when: '12 nov', posted: false },
  ],

  ruleStatus: { posted: 'Lançada', scheduled: 'Agendada' },

  featuresIntro: {
    eyebrow: 'O livro-caixa',
    title: 'Tudo o que a casa gasta, guarda e deve.',
    lede: 'Cadastre suas contas uma vez e deixe o livro-caixa se manter certo sozinho — as regras lançam as contas, os atalhos preenchem os formulários, limites e metas marcam o placar.',
  },

  features: {
    transactions: {
      key: 'transactions',
      tone: 'blue',
      icon: ArrowsLeftRight,
      title: 'Cada movimento, agrupado por dia',
      body: 'Filtre por mês, veja os totais do dia de relance e mantenha o saldo de cada conta certo enquanto o dinheiro entra e sai.',
    },
    accounts: {
      key: 'accounts',
      tone: 'yellow',
      icon: Wallet,
      title: 'Contas e cartões',
      body: 'Contas bancárias e cartões de crédito com seus saldos, datas de fechamento e vencimento — em reais, dólares ou euros.',
    },
    recurring: {
      key: 'recurring',
      tone: 'green',
      icon: Repeat,
      title: 'Contas que se lançam sozinhas',
      body: 'Regras recorrentes criam a transação na data certa, para que aluguel e assinaturas nunca fiquem sem registro.',
    },
    limits: {
      key: 'limits',
      tone: 'red',
      icon: Gauge,
      title: 'Limites por categoria',
      body: 'Defina quanto uma categoria pode custar no dia, na semana, no mês ou no ano — e veja a barra encher antes de estourar.',
    },
    goals: {
      key: 'goals',
      tone: 'green',
      icon: Target,
      title: 'Metas com medidor',
      body: 'Aponte uma meta para uma conta de reserva e um saldo-alvo. O medidor enche conforme a conta cresce.',
    },
    household: {
      key: 'household',
      tone: 'blue',
      icon: UsersThree,
      title: 'Uma casa, várias mãos',
      body: 'Todos da casa entram no mesmo livro-caixa — novos membros chegam com um código de convite.',
    },
    linkers: {
      key: 'linkers',
      tone: 'yellow',
      icon: CalendarCheck,
      title: 'Atalhos que preenchem o formulário',
      body: 'Digite “Aluguel do mês” e a categoria e o favorecido se preenchem. Os favorecidos sabem se o dinheiro foi para uma pessoa, um serviço, um comércio ou uma instituição de caridade.',
    },
  },

  plannersIntro: {
    eyebrow: 'Planejadores',
    title: 'Faça as contas antes de o dinheiro se mexer.',
    lede: 'Calculadoras que não precisam de dados do seu livro-caixa — abra, mude um número e veja como ficam os próximos vinte anos.',
  },

  planners: [
    {
      icon: Percent,
      tone: 'blue',
      title: 'Juros simples vs compostos',
      body: 'O mesmo dinheiro crescendo de dois jeitos — só sobre o principal, ou sobre os juros também.',
    },
    {
      icon: Calculator,
      tone: 'yellow',
      title: 'Conversão de taxas',
      body: 'Converta uma taxa entre ano, mês e dia útil — por capitalização, nunca por divisão.',
    },
    {
      icon: Plant,
      tone: 'green',
      title: 'Independência financeira',
      body: 'Quanto guardar por mês para chegar a um alvo, e quanto um saldo rende quando você para.',
    },
    {
      icon: House,
      tone: 'red',
      title: 'Comprar ou alugar',
      body: 'Financiar um imóvel contra alugar e investir a diferença, mês a mês.',
    },
    {
      icon: Lightbulb,
      tone: 'yellow',
      title: 'Dicas financeiras',
      body: 'Guias curtos — os seis potes, hábitos de poupança, uma estratégia de organização — sem precisar de conta.',
    },
  ],

  pricingIntro: {
    eyebrow: 'Preços',
    title: 'Quatro formas de entrar. Uma delas é grátis para sempre.',
    lede: 'O código é o mesmo em todos os planos. Você escolhe quem roda o servidor — e se um assistente lê o livro-caixa com você.',
  },

  selfHosted: {
    badge: 'Grátis · Auto-hospedado',
    name: 'Hospede você mesmo',
    tagline:
      'Todos os recursos, sem limites, no seu próprio hardware. Clone o repositório, suba a stack e as finanças nunca saem de casa.',
    price: 'R$ 0',
    priceNote: 'para sempre, código aberto',
    perks: [
      { label: 'Todos os recursos, contas e histórico ilimitados' },
      { label: 'Seu PostgreSQL, seus dados, seus backups' },
      { label: 'Stack Docker Compose, pronta em minutos' },
      { label: 'Suporte da comunidade no GitHub' },
    ],
    commands: [
      `git clone ${GITHUB_URL}.git`,
      'cd OpenHouse',
      'docker compose up --build',
    ],
    cta: { label: 'Baixe no GitHub', href: GITHUB_URL },
  },

  hostedPlans: [
    {
      name: 'Freemium',
      tagline:
        'Custo zero nos nossos servidores, do tamanho certo para começar.',
      price: 'R$ 0',
      priceNote: 'hospedado pelo OpenHouse',
      perks: [
        { label: 'Até 2 contas' },
        { label: '12 meses de histórico' },
        { label: 'Transações, categorias, limites e metas' },
        { label: 'Todos os planejadores e guias' },
        { label: 'Regras recorrentes e atalhos', included: false },
        { label: 'Membros da casa', included: false },
      ],
      cta: { label: 'Comece grátis', href: SIGN_UP_URL },
    },
    {
      name: 'Premium',
      tagline:
        'Todos os recursos, sem limites — a gente mantém o servidor rodando.',
      price: 'Em breve',
      priceNote: 'preço anunciado no lançamento',
      perks: [
        { label: 'Contas e histórico ilimitados' },
        { label: 'Regras recorrentes e atalhos de transação' },
        { label: 'Membros da casa por código de convite' },
        { label: 'Backups e atualizações gerenciados' },
        { label: 'Assistente de IA', included: false },
      ],
      cta: { label: 'Entre no acesso antecipado', href: SIGN_UP_URL },
    },
    {
      name: 'Premium IA',
      tagline:
        'Tudo do Premium, mais um assistente que lê o livro-caixa com você.',
      price: 'Em breve',
      priceNote: 'preço anunciado no lançamento',
      perks: [
        { label: 'Tudo do Premium' },
        { label: 'Categorias sugeridas a partir de cada descrição' },
        { label: 'Pergunte ao seu livro-caixa em linguagem natural' },
        { label: 'Resumos mensais de insights' },
        { label: 'Avisos antes de um limite estourar' },
      ],
      cta: { label: 'Entre no acesso antecipado', href: SIGN_UP_URL },
      featured: true,
    },
  ],

  featuredBadge: 'Mais completo',

  faqIntro: {
    eyebrow: 'Dúvidas',
    title: 'Antes de mudar as finanças para cá.',
  },

  faq: [
    {
      question: 'É mesmo grátis hospedar por conta própria?',
      answer:
        'Sim. O plano auto-hospedado custa R$ 0 para sempre e traz todos os recursos, sem limites. Clone o repositório, rode docker compose up --build e a stack sobe no seu próprio hardware.',
    },
    {
      question: 'Onde ficam os meus dados?',
      answer:
        'Auto-hospedado, eles ficam no seu próprio PostgreSQL — seus dados, seus backups. Num plano hospedado, o OpenHouse roda o servidor e cuida dos backups e atualizações para você.',
    },
    {
      question: 'O código hospedado é diferente do código aberto?',
      answer:
        'Não. O código é o mesmo em todos os planos. O que muda é quem roda o servidor e se um assistente lê o livro-caixa com você.',
    },
    {
      question: 'Mais de uma pessoa pode usar o mesmo livro-caixa?',
      answer:
        'Sim. Todos da casa entram no mesmo livro-caixa, e novos membros chegam com um código de convite. Membros da casa fazem parte do Premium e de toda instalação auto-hospedada.',
    },
    {
      question: 'Quais moedas ele aceita?',
      answer:
        'Contas e cartões podem ser mantidos em reais, dólares ou euros, cada um com seu próprio saldo e, para cartões, datas de fechamento e vencimento.',
    },
  ],

  openSource: {
    eyebrow: 'Código aberto',
    title: 'Sua casa. Seu servidor. Seu código.',
    body: 'O OpenHouse é construído às claras. Leia cada linha, rode na sua própria máquina e mande um pull request quando a casa precisar de um cômodo novo.',
    points: [
      { icon: Bank, label: 'Sobre PostgreSQL, schema no repositório' },
      { icon: House, label: 'Uma única stack Docker Compose' },
      { icon: UsersThree, label: 'Casas com vários membros, de fábrica' },
    ],
    cta: { label: 'Dê uma estrela no GitHub', href: GITHUB_URL },
  },

  footer: {
    tagline: 'Finanças da casa, em código aberto.',
    copyright: `© ${new Date().getFullYear()} CouraLabs`,
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Recursos', href: '#features' },
      { label: 'Preços', href: '#pricing' },
      { label: 'Entrar', href: SIGN_IN_URL },
    ],
  },
}

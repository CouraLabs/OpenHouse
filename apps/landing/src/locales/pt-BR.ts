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

export const ptBR: Content = {
  meta: {
    title: 'OpenHouse | O dinheiro da casa, em um só lugar',
    description:
      'O OpenHouse reúne todas as contas e cartões da casa em um livro-caixa compartilhado. Ele lança as contas fixas, soma a fatura do cartão enquanto você gasta e avisa antes de cada vencimento. Grátis para começar, de código aberto e grátis para sempre se você hospedar.',
  },

  navLinks: [
    { label: 'Por quê', href: '#why' },
    { label: 'Recursos', href: '#features' },
    { label: 'Planejadores', href: '#planners' },
    { label: 'O que vem', href: '#the-house' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Dúvidas', href: '#faq' },
  ],

  navActions: {
    signIn: { label: 'Entrar', href: SIGN_IN_URL },
    start: { label: 'Comece grátis', href: SIGN_UP_URL },
    themeToggle: 'Alternar tema escuro',
    localeToggle: 'Ver em inglês',
  },

  hero: {
    headline: 'Saiba o que vence antes da conta chegar.',
    tagline:
      'O OpenHouse reúne as contas bancárias e os cartões da casa em um só lugar, e todo mundo que mora nela vê os mesmos números. O aluguel e as assinaturas entram sozinhos todo mês, a fatura do cartão vai somando enquanto você gasta e você recebe um aviso alguns dias antes de cada vencimento.',
    primary: { label: 'Comece grátis', href: SIGN_UP_URL },
    secondary: { label: 'Hospede você mesmo', href: GITHUB_URL },
    stack: 'Plano grátis, sem cartão de crédito. O código é aberto no GitHub.',
    windowTitle: 'openhouse · Transações',
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

  problemsIntro: {
    eyebrow: 'Por que o OpenHouse',
    title: 'O dinheiro da casa sai do controle sempre do mesmo jeito.',
    lede: 'Os números costumam ficar na cabeça de uma pessoa, numa planilha que ninguém atualiza e em três ou quatro apps de banco. O OpenHouse junta tudo em um lugar e mantém em dia.',
  },

  problems: [
    {
      icon: CreditCard,
      tone: 'red',
      pain: 'A fatura do cartão veio maior do que todo mundo esperava.',
      fix: 'Cada compra entra na fatura certa, então você acompanha o total o mês inteiro. Um lembrete chega alguns dias antes do vencimento.',
    },
    {
      icon: TrendDown,
      tone: 'yellow',
      pain: 'A conta fica no vermelho e quem avisa é o banco.',
      fix: 'A página Próximos projeta seus saldos a partir das contas agendadas e das faturas, e mostra o dia em que uma conta ficaria negativa.',
    },
    {
      icon: FileArrowUp,
      tone: 'blue',
      pain: 'A planilha de orçamento durou duas semanas.',
      fix: 'Envie o extrato do banco em OFX, QFX ou CSV e as transações entram. Aluguel e assinaturas se lançam sozinhos todo mês.',
    },
    {
      icon: UsersThree,
      tone: 'green',
      pain: 'Só uma pessoa sabe como está o dinheiro.',
      fix: 'Todo mundo da casa entra nos mesmos livros e vê os mesmos saldos, limites e metas. Quem chega entra com um código de convite.',
    },
  ],

  houseIntro: {
    eyebrow: 'O que vem',
    title: 'O dinheiro é o primeiro cômodo. Outros estão a caminho.',
    lede: 'O OpenHouse está virando um app para cuidar da casa inteira. Cada parte nova vai usar o mesmo login e os mesmos membros da casa.',
  },

  houseStatus: { live: 'Disponível', coming: 'Planejado' },

  houseModules: [
    {
      name: 'Dinheiro',
      kind: 'O livro-caixa',
      description: 'Contas, cartões, faturas, transações, limites e metas.',
      tone: 'green',
      status: 'live',
    },
    {
      name: 'Despensa',
      kind: 'Os armários',
      description:
        'O que tem nos armários, o que está acabando, o que comprar.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'Refeições',
      kind: 'A mesa',
      description: 'Planeje as refeições da semana com o que tem na despensa.',
      tone: 'red',
      status: 'coming',
    },
    {
      name: 'Lavanderia & organização',
      kind: 'Os guarda-roupas',
      description: 'Onde as coisas estão guardadas e o que está limpo.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Pets',
      kind: 'Os bichos',
      description:
        'Alimentação, consultas no veterinário e a ficha de cada bicho.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'Saúde',
      kind: 'Bem-estar',
      description: 'Consultas, remédios e os registros da família.',
      tone: 'red',
      status: 'coming',
    },
    {
      name: 'Tarefas',
      kind: 'A lista',
      description: 'Uma lista de tarefas que a casa inteira vê.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Calendário',
      kind: 'As datas',
      description: 'Um calendário só para a casa toda.',
      tone: 'yellow',
      status: 'coming',
    },
    {
      name: 'E-mail',
      kind: 'As cartas',
      description:
        'A correspondência da casa, ligada às suas caixas de entrada.',
      tone: 'blue',
      status: 'coming',
    },
    {
      name: 'Telegram & WhatsApp',
      kind: 'As conversas',
      description:
        'Lembretes e novidades nos apps de conversa que você já usa.',
      tone: 'red',
      status: 'coming',
    },
  ],

  featuresIntro: {
    eyebrow: 'Recursos',
    title: 'O que a casa gasta, guarda e deve, em um só livro-caixa.',
    lede: 'Cadastre suas contas uma vez. Depois disso, quase toda a contabilidade acontece sem você.',
  },

  features: {
    transactions: {
      key: 'transactions',
      tone: 'blue',
      icon: ArrowsLeftRight,
      title: 'Cada transação, dia a dia',
      body: 'Veja o que saiu em cada dia com o total do dia, filtre por mês e acompanhe cada saldo mudar conforme o dinheiro entra e sai.',
    },
    accounts: {
      key: 'accounts',
      tone: 'yellow',
      icon: Wallet,
      title: 'Contas e cartões',
      body: 'Conta corrente, poupança e cartões lado a lado, com o fechamento e o vencimento de cada cartão. As contas podem ser em reais, dólares ou euros.',
    },
    recurring: {
      key: 'recurring',
      tone: 'green',
      icon: Repeat,
      title: 'Contas que se lançam sozinhas',
      body: 'Diga ao OpenHouse que o aluguel vence dia 1º e ele lança o pagamento todo mês, para nada sumir dos livros.',
    },
    limits: {
      key: 'limits',
      tone: 'red',
      icon: Gauge,
      title: 'Limites de gasto',
      body: 'Defina um teto para mercado ou restaurantes por dia, semana, mês ou ano, e veja quanto falta antes de estourar.',
    },
    goals: {
      key: 'goals',
      tone: 'green',
      icon: Target,
      title: 'Metas de economia',
      body: 'Escolha uma conta de reserva e um saldo-alvo. A meta enche conforme a conta cresce.',
    },
    household: {
      key: 'household',
      tone: 'blue',
      icon: UsersThree,
      title: 'Compartilhado com a casa',
      body: 'Parceiros e família entram nos mesmos livros. Quem chega entra com um código de convite.',
    },
    linkers: {
      key: 'linkers',
      tone: 'yellow',
      icon: CalendarCheck,
      title: 'Menos digitação',
      body: 'Digite “Aluguel do mês” e a categoria e o favorecido se preenchem. Cada favorecido é marcado como pessoa, serviço, loja ou instituição de caridade.',
    },
  },

  plannersIntro: {
    eyebrow: 'Planejadores',
    title: 'Faça as contas antes de decidir.',
    lede: 'Calculadoras para as grandes perguntas sobre dinheiro. Elas não mexem no seu livro-caixa: mude um número e veja o que acontece nos próximos vinte anos.',
  },

  planners: [
    {
      icon: Percent,
      tone: 'blue',
      title: 'Juros simples vs compostos',
      body: 'Como o mesmo dinheiro cresce quando os juros incidem só sobre o que você aplicou, e quando incidem também sobre os juros.',
    },
    {
      icon: Calculator,
      tone: 'yellow',
      title: 'Conversão de taxas',
      body: 'Transforme uma taxa anual em mensal ou por dia útil do jeito certo, compondo em vez de dividir.',
    },
    {
      icon: Plant,
      tone: 'green',
      title: 'Independência financeira',
      body: 'Quanto guardar por mês para chegar a um valor, e quanto esse saldo rende quando você parar.',
    },
    {
      icon: House,
      tone: 'red',
      title: 'Comprar ou alugar',
      body: 'Compare financiar um imóvel com alugar e investir a diferença, mês a mês.',
    },
    {
      icon: Lightbulb,
      tone: 'yellow',
      title: 'Dicas financeiras',
      body: 'Guias curtos sobre o método dos seis potes, hábitos de economia e um jeito de organizar as finanças. Não precisa de conta.',
    },
  ],

  pricingIntro: {
    eyebrow: 'Preços',
    title: 'Comece grátis. Pague quando a casa precisar de mais.',
    lede: 'Todos os planos rodam o mesmo código. Os preços hospedados são por mês. Hospedar você mesmo não custa nada.',
  },

  selfHosted: {
    badge: 'Grátis · Auto-hospedado',
    name: 'Hospede você mesmo',
    tagline:
      'Todos os recursos, sem limites, na sua própria conta Cloudflare. Clone o código, rode um comando e seus dados ficam na sua conta.',
    price: 'R$ 0',
    priceNote: 'grátis para sempre, código aberto',
    perks: [
      { label: 'Todos os recursos, sem limite de contas ou histórico' },
      { label: 'Seu próprio banco D1 e seus próprios backups' },
      { label: 'Um comando de deploy, no ar em minutos' },
      { label: 'Ajuda da comunidade no GitHub' },
    ],
    commands: [
      `git clone ${GITHUB_URL}.git`,
      'cd OpenHouse && npm install',
      'npx wrangler login && npm run deploy',
    ],
    cta: { label: 'Baixe no GitHub', href: GITHUB_URL },
  },

  hostedPlans: [
    {
      name: 'Free',
      tagline: 'Para uma pessoa começar.',
      price: 'R$ 0',
      priceNote: 'por mês',
      perks: [
        { label: 'Até 2 contas, categorias, limites, metas e contas fixas' },
        { label: 'Os últimos 3 meses de transações' },
        { label: '1 importação de extrato e 1 exportação por mês' },
        { label: 'Todos os planejadores e guias' },
        { label: 'Membros da casa', included: false },
        {
          label: 'Conectado em vários aparelhos ao mesmo tempo',
          included: false,
        },
      ],
      cta: { label: 'Comece grátis', href: SIGN_UP_URL },
    },
    {
      name: 'Plus',
      tagline: 'Para a casa que cuida das finanças aqui.',
      price: 'R$ 15',
      priceNote: 'por mês, mais R$ 2 por membro extra',
      perks: [
        { label: 'Convide todo mundo da casa' },
        { label: 'Até 10 contas, categorias, limites, metas e contas fixas' },
        { label: 'Todo o histórico de transações' },
        { label: '5 importações de extrato e 5 exportações por mês' },
        { label: 'Todos os planejadores e guias' },
        {
          label: 'Conectado em vários aparelhos ao mesmo tempo',
          included: false,
        },
      ],
      cta: { label: 'Entre no acesso antecipado', href: SIGN_UP_URL },
      featured: true,
    },
    {
      name: 'Pro',
      tagline: 'O Plus, com apps de conversa e IA.',
      price: 'R$ 30',
      priceNote: 'por mês, mais R$ 2 por membro extra',
      perks: [
        { label: 'Tudo do Plus' },
        { label: 'Conectado em vários aparelhos ao mesmo tempo' },
        { label: 'Avisos no Telegram e no WhatsApp (em breve)' },
        { label: 'Recursos de IA com limite de uso (em breve)' },
        { label: 'Assistente da casa', included: false },
      ],
      cta: { label: 'Entre no acesso antecipado', href: SIGN_UP_URL },
    },
    {
      name: 'Max',
      tagline: 'Tudo, incluindo o assistente da casa.',
      price: 'R$ 40',
      priceNote: 'por mês, mais R$ 2 por membro extra',
      perks: [
        { label: 'Tudo do Pro' },
        { label: 'Assistente da casa (em breve)' },
      ],
      cta: { label: 'Entre no acesso antecipado', href: SIGN_UP_URL },
    },
  ],

  featuredBadge: 'Ideal para a casa',

  faqIntro: {
    eyebrow: 'Dúvidas',
    title: 'Antes de trazer as contas para cá.',
  },

  faq: [
    {
      question: 'O OpenHouse se conecta ao meu banco?',
      answer:
        'Não. Você lança as transações à mão, por contas fixas ou enviando o extrato do banco (OFX, QFX ou CSV). O arquivo é lido uma vez e não fica guardado, e uma importação pode ser desfeita por 24 horas.',
    },
    {
      question: 'É mesmo grátis hospedar por conta própria?',
      answer:
        'Sim. Hospedar você mesmo não custa nada e traz todos os recursos, sem limites. Clone o repositório, rode npm run deploy e ele sobe na sua própria conta Cloudflare, com o seu próprio banco de dados.',
    },
    {
      question: 'Onde ficam os meus dados?',
      answer:
        'Se você hospedar, num banco D1 na sua própria conta Cloudflare. Num plano hospedado, o OpenHouse cuida do servidor, dos backups e das atualizações.',
    },
    {
      question: 'Mais de uma pessoa pode usar os mesmos livros?',
      answer:
        'Sim, a partir do Plus e em toda instalação própria. Todo mundo entra no mesmo livro-caixa, e quem chega entra com um código de convite. Cada membro extra custa R$ 2 por mês num plano hospedado.',
    },
    {
      question: 'O que acontece com as transações antigas no plano Free?',
      answer:
        'O Free mostra os últimos 3 meses. As transações mais antigas ficam ocultas, não são apagadas, e voltam a aparecer quando você muda para um plano pago.',
    },
    {
      question: 'Quais moedas ele aceita?',
      answer:
        'Contas e cartões podem ser em reais, dólares ou euros. Cada conta tem a sua moeda, e os valores não são convertidos entre elas.',
    },
    {
      question: 'O código hospedado é diferente do código aberto?',
      answer:
        'Não. Todos os planos rodam o mesmo código. Os planos mudam em quem cuida do servidor e em quanto você pode guardar.',
    },
    {
      question: 'O que vem depois do dinheiro?',
      answer:
        'Despensa, refeições, tarefas, pets, saúde, calendário, e-mail e Telegram e WhatsApp estão planejados. Cada um vai entrar no mesmo app, com o mesmo login e os mesmos membros, e a parte do dinheiro continua funcionando como hoje.',
    },
  ],

  openSource: {
    eyebrow: 'Código aberto',
    title: 'Sua casa. Seu servidor. Seu código.',
    body: 'Todo o OpenHouse está no GitHub. Leia o código, rode na sua própria conta ou mande um pull request quando a casa precisar de um cômodo novo.',
    points: [
      { icon: Bank, label: 'Dados no seu próprio banco D1' },
      { icon: House, label: 'Um Worker, um comando de deploy' },
      { icon: UsersThree, label: 'Casas com vários membros' },
    ],
    cta: { label: 'Dê uma estrela no GitHub', href: GITHUB_URL },
  },

  footer: {
    tagline: 'O dinheiro da casa, em um só lugar.',
    copyright: `© ${new Date().getFullYear()} CouraLabs`,
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Recursos', href: '#features' },
      { label: 'Preços', href: '#pricing' },
      { label: 'Entrar', href: SIGN_IN_URL },
    ],
  },
}

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

export const ptBR: Content = {
  meta: {
    title: 'Kantim | Seu cantinho, bem cuidado',
    description:
      'O Kantim é o assistente da sua casa. Ele cuida do seu dinheiro, das contas, da saúde, da família, dos pets, das tarefas, da manutenção e da comida, tudo em um só lugar, e lembra o que vence para você não precisar guardar tudo na cabeça. Grátis para começar, de código aberto e grátis para sempre se você hospedar.',
  },

  navLinks: [
    { label: 'Por quê', href: '#why' },
    { label: 'Sua casa', href: '#the-house' },
    { label: 'Recursos', href: '#features' },
    { label: 'Planejadores', href: '#planners' },
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
    headline: 'Seu cantinho, bem cuidado.',
    tagline:
      'O Kantim é o assistente da sua casa. Ele cuida do seu dinheiro, das contas, da saúde, da família, dos pets, das tarefas, da manutenção e da comida, tudo em um só lugar. Ele lembra o que vence e o que está acabando, para você não precisar lembrar de tudo.',
    primary: { label: 'Comece grátis', href: SIGN_UP_URL },
    secondary: { label: 'Hospede você mesmo', href: GITHUB_URL },
    stack: 'Plano grátis, sem cartão de crédito. O código é aberto no GitHub.',
    windowTitle: 'kantim · Transações',
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
    eyebrow: 'Por que o Kantim',
    title:
      'A casa funciona com centenas de coisinhas. A maioria mora na cabeça de alguém.',
    lede: 'A conta de luz fica num aplicativo, a lista de compras num bilhete na geladeira, a consulta do pet num grupo de conversa, e as tarefas da casa em lugar nenhum. O Kantim junta tudo em um só lugar e mantém tudo em dia, para que nada dependa de quem lembrou.',
  },

  problems: [
    {
      icon: CreditCard,
      tone: 'red',
      pain: 'A conta venceu ontem e ninguém lembrou.',
      fix: 'Toda conta tem data de vencimento e um aviso alguns dias antes. As faturas dos cartões vão somando conforme você gasta, então o total nunca é surpresa.',
    },
    {
      icon: ShoppingCart,
      tone: 'yellow',
      pain: 'Duas pessoas compraram leite, e o detergente acabou de novo.',
      fix: 'A despensa mostra o que tem, o que está acabando e o que vai vencer. A lista de compras está sempre atualizada.',
    },
    {
      icon: PawPrint,
      tone: 'blue',
      pain: 'A vacina venceu no mês passado e ninguém percebeu.',
      fix: 'Cada pet tem a sua ficha: vacinas, consultas, remédios e alimentação. As próximas consultas e doses chegam para você antes de atrasar.',
    },
    {
      icon: ListChecks,
      tone: 'green',
      pain: 'As tarefas da casa ficam na cabeça de uma pessoa só.',
      fix: 'Cada tarefa tem um responsável, uma data e um lembrete, então todo mundo na casa sabe o que é seu e o que falta.',
    },
  ],

  houseIntro: {
    eyebrow: 'A casa toda',
    title: 'Um assistente para tudo o que a sua casa precisa.',
    lede: 'O nome vem de “meu cantinho”: o seu lugar, aquele canto onde a rotina acontece e onde você vive com as pessoas que ama. O Kantim cuida de tudo isso, para uma pessoa sozinha ou para a família inteira.',
  },

  houseModules: [
    {
      name: 'Dinheiro',
      kind: 'Seu patrimônio',
      description:
        'Contas e cartões em reais, dólares ou euros, orçamentos, metas de economia e as despesas que a casa divide.',
      tone: 'green',
    },
    {
      name: 'Contas',
      kind: 'Em dia',
      description:
        'Aluguel, luz, água, assinaturas e faturas de cartão, cada uma com um aviso antes do vencimento.',
      tone: 'yellow',
    },
    {
      name: 'Saúde',
      kind: 'Bem-estar',
      description:
        'Consultas, remédios e registros de todo mundo que mora na casa.',
      tone: 'red',
    },
    {
      name: 'Família',
      kind: 'Juntos',
      description:
        'Um calendário compartilhado, avisos para todos e os eventos de cada membro.',
      tone: 'blue',
    },
    {
      name: 'Pets',
      kind: 'Cuidado',
      description:
        'Vacinas, consultas no veterinário, remédios, banho e tosa e a rotina de alimentação de cada pet.',
      tone: 'yellow',
    },
    {
      name: 'Tarefas',
      kind: 'A lista',
      description:
        'Afazeres diários e semanais, uma escala de limpeza e um responsável por cada tarefa.',
      tone: 'green',
    },
    {
      name: 'Manutenção',
      kind: 'Cuidados',
      description:
        'Manutenção preventiva, garantias, histórico de serviços e os documentos da casa, para o ar-condicionado ser revisado antes de quebrar.',
      tone: 'red',
    },
    {
      name: 'Comida',
      kind: 'A despensa',
      description:
        'O que tem nos armários e na geladeira, datas de validade, a lista de compras e ideias de refeição com o que você já tem.',
      tone: 'blue',
    },
    {
      name: 'Lembretes',
      kind: 'O empurrãozinho',
      description:
        'Um sistema de lembretes para todas as áreas da casa, no app e, em planos com mensagens, no Telegram e no WhatsApp.',
      tone: 'yellow',
    },
  ],

  featuresIntro: {
    eyebrow: 'Como funciona',
    title: 'Configure uma vez. Depois a casa se mantém em dia.',
    lede: 'O Kantim faz a contabilidade e a memória, para você cuidar do seu dia.',
  },

  features: {
    transactions: {
      key: 'transactions',
      tone: 'blue',
      icon: ArrowsLeftRight,
      title: 'Tudo que se movimentou, dia a dia',
      body: 'Veja o que saiu e o que entrou em cada dia, com o total do dia. Filtre por mês e acompanhe cada saldo mudar conforme o dinheiro entra e sai.',
    },
    accounts: {
      key: 'accounts',
      tone: 'yellow',
      icon: Wallet,
      title: 'Todas as contas e cartões, lado a lado',
      body: 'Conta corrente, poupança e cartões de crédito numa só tela, cada um com a data de fechamento e de vencimento. As contas podem ser em reais, dólares ou euros.',
    },
    recurring: {
      key: 'recurring',
      tone: 'green',
      icon: Repeat,
      title: 'Contas que se registram sozinhas',
      body: 'Diga ao Kantim que o aluguel vence dia 1º. Ele registra o pagamento todo mês, e você recebe um aviso antes do vencimento.',
    },
    limits: {
      key: 'limits',
      tone: 'red',
      icon: Gauge,
      title: 'Limites de gasto que avisam antes',
      body: 'Defina um teto para mercado ou restaurantes por dia, semana, mês ou ano, e veja quanto falta antes de estourar.',
    },
    goals: {
      key: 'goals',
      tone: 'green',
      icon: Target,
      title: 'Metas de economia que você enxerga',
      body: 'Escolha uma conta de reserva e um valor-alvo. A meta enche conforme o dinheiro cresce.',
    },
    household: {
      key: 'household',
      tone: 'blue',
      icon: UsersThree,
      title: 'Uma casa, todos os membros',
      body: 'Parceiros, filhos e colegas de casa entram na mesma casa e veem as mesmas contas, tarefas e saldos. Quem chega entra com um código de convite.',
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
    lede: 'Calculadoras para as grandes decisões da casa. Elas funcionam sem conta e não mexem nos seus livros: mude um número e veja o que acontece nos próximos vinte anos.',
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
      body: 'Guias curtos sobre o método dos seis potes, hábitos de economia e um jeito de organizar as finanças da casa. Não precisa de conta.',
    },
  ],

  pricingIntro: {
    eyebrow: 'Preços',
    title: 'Comece grátis. Pague quando sua casa crescer.',
    lede: 'Todos os planos têm o app inteiro. Os planos pagos aumentam o espaço para mais contas, membros e histórico, além de mensagens e IA. Os preços hospedados são por mês, em reais. Hospedar você mesmo não custa nada.',
  },

  selfHosted: {
    badge: 'Grátis · Auto-hospedado',
    name: 'Hospede você mesmo',
    tagline:
      'O app inteiro, sem limites, na sua própria conta Cloudflare. Clone o código, rode um comando e os dados da sua casa ficam com você.',
    price: 'R$ 0',
    priceNote: 'grátis para sempre, código aberto',
    perks: [
      { label: 'Todas as áreas da casa, sem limite de contas ou histórico' },
      { label: 'Seu próprio banco D1 e seus próprios backups' },
      { label: 'Um comando de deploy, no ar em minutos' },
      { label: 'Ajuda da comunidade no GitHub' },
    ],
    commands: [
      `git clone ${GITHUB_URL}.git`,
      'cd Kantim && npm install',
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
        { label: 'Todas as áreas da casa, do dinheiro aos pets' },
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
      tagline: 'Para a casa que cuida de tudo por aqui.',
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
    title: 'Antes de mudar a sua casa para cá.',
  },

  faq: [
    {
      question: 'O Kantim é só para dinheiro?',
      answer:
        'Não. O Kantim cuida da casa inteira: dinheiro e contas, saúde, família, pets, tarefas, manutenção e comida. Tudo usa o mesmo login e os mesmos membros, então funciona junto.',
    },
    {
      question: 'Preciso ter família para usar?',
      answer:
        'Não. O Kantim funciona para uma pessoa morando sozinha, um casal, uma família ou uma casa dividida. Numa casa de uma pessoa só, as partes compartilhadas ficam de lado.',
    },
    {
      question: 'O Kantim se conecta ao meu banco?',
      answer:
        'Não. Você lança as transações à mão, por contas fixas ou enviando o extrato do banco (OFX, QFX ou CSV). O arquivo é lido uma vez e não fica guardado, e uma importação pode ser desfeita por 24 horas.',
    },
    {
      question: 'Mais de uma pessoa pode usar a mesma casa?',
      answer:
        'Sim, a partir do Plus e em toda instalação própria. Todo mundo entra na mesma casa e vê as mesmas contas, tarefas e saldos. Quem chega entra com um código de convite. Num plano hospedado, cada membro extra custa R$ 2 por mês.',
    },
    {
      question: 'É mesmo grátis hospedar por conta própria?',
      answer:
        'Sim. Hospedar você mesmo não custa nada e traz todos os recursos, sem limites. Clone o repositório, rode npm run deploy e ele sobe na sua própria conta Cloudflare, com o seu próprio banco de dados.',
    },
    {
      question: 'Onde ficam os meus dados?',
      answer:
        'Se você hospedar, num banco D1 na sua própria conta Cloudflare. Num plano hospedado, o Kantim cuida do servidor, dos backups e das atualizações.',
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
  ],

  openSource: {
    eyebrow: 'Código aberto',
    title: 'Sua casa. Seu servidor. Seu código.',
    body: 'Todo o Kantim está no GitHub. Leia o código, rode na sua própria conta ou mande um pull request quando a sua casa precisar de um cômodo novo.',
    points: [
      { icon: Bank, label: 'Dados no seu próprio banco D1' },
      { icon: House, label: 'Um Worker, um comando de deploy' },
      {
        icon: UsersThree,
        label: 'Feito para uma pessoa ou para a família inteira',
      },
    ],
    cta: { label: 'Dê uma estrela no GitHub', href: GITHUB_URL },
  },

  footer: {
    tagline: 'Tudo sobre a sua casa, em um só lugar.',
    copyright: `© ${new Date().getFullYear()} CouraLabs`,
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Sua casa', href: '#the-house' },
      { label: 'Preços', href: '#pricing' },
      { label: 'Entrar', href: SIGN_IN_URL },
    ],
  },
}

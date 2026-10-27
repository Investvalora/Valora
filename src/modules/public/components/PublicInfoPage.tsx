import { Link } from 'react-router-dom'

type Page = 'about' | 'privacy' | 'terms'
const contact = 'valorainvestbr@gmail.com'

const content: Record<Page, { title: string; description: string; sections: { title: string; text: string }[] }> = {
  about: {
    title: 'Conheça o Valora',
    description: 'Organize seus investimentos e entenda os números da sua carteira.',
    sections: [
      { title: 'Sua carteira em um só lugar', text: 'Cadastre seus ativos e movimentações, acompanhe a composição e a evolução do patrimônio e consulte proventos e alertas.' },
      { title: 'Análises com critérios claros', text: 'Explore indicadores, scores e estimativas de preço-teto. Os resultados ajudam a organizar sua análise e não substituem uma avaliação pessoal dos riscos.' },
      { title: 'Acesso por email ou Google', text: 'Você pode criar uma conta por email ou usar sua conta Google. O login Google solicita informações básicas de identificação; não solicita acesso à sua caixa de email ou aos arquivos do Drive.' },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    description: 'Como os dados são usados no Valora e como entrar em contato sobre sua privacidade.',
    sections: [
      { title: 'Projeto e contato', text: `Esta política descreve o uso de dados no Valora. Para falar com a equipe sobre sua conta ou seus dados pessoais, escreva para ${contact}.` },
      { title: 'Dados informados por você', text: 'No cadastro por email, são solicitados nome e email; telefone é opcional. A senha é processada pelo serviço de autenticação. O aplicativo também armazena as carteiras, posições, movimentações, recebimentos, alertas e preferências que você registra.' },
      { title: 'Login com Google', text: 'Ao escolher esse login, o Google fornece dados básicos da conta, como identificador, nome, email e, quando disponibilizada, foto de perfil. Esses dados identificam sua conta e permitem o acesso ao Valora. O aplicativo não solicita acesso ao Gmail, aos contatos nem aos arquivos do Google Drive.' },
      { title: 'Para que usamos os dados', text: 'Os dados são usados para criar e autenticar sua conta, apresentar sua carteira, realizar os cálculos e análises solicitados, guardar suas preferências e enviar mensagens de confirmação e recuperação de acesso. Registros técnicos de acesso e erros podem ser usados para operar e proteger o serviço.' },
      { title: 'Serviços utilizados', text: 'O Valora utiliza Supabase para autenticação e armazenamento e Vercel para hospedagem. O Google participa quando você escolhe o login Google. O provedor de email configurado pela equipe recebe o endereço e o conteúdo necessário para enviar mensagens de acesso. Esses fornecedores podem processar dados em infraestrutura localizada fora do Brasil.' },
      { title: 'Dados no navegador', text: 'O navegador guarda informações de sessão necessárias para manter seu acesso e preferências locais, como opções de visualização. Ao usar um dispositivo compartilhado, encerre a sessão após o uso. Limpar os dados do navegador pode remover preferências locais.' },
      { title: 'Armazenamento e solicitações', text: 'Os dados da conta são mantidos para permitir o funcionamento da carteira e dos recursos solicitados. Para pedir acesso, correção ou exclusão dos seus dados ou obter informações sobre retenção, contate a equipe. Alguns registros podem precisar ser preservados para cumprir obrigações aplicáveis ou proteger direitos; a equipe deve informar as condições pertinentes ao atender a solicitação.' },
      { title: 'Segurança', text: 'O acesso à conta exige autenticação, e os dados de carteira são separados por usuário no banco. Nenhum serviço elimina todos os riscos. Não compartilhe sua senha nem envie senhas ou códigos de acesso ao contato de suporte.' },
      { title: 'Atualizações', text: 'Esta página pode ser atualizada para refletir mudanças no serviço e no tratamento de dados. A data da versão aparece abaixo do título.' },
    ],
  },
  terms: {
    title: 'Termos de Uso',
    description: 'Condições de utilização das ferramentas de organização e análise do Valora.',
    sections: [
      { title: 'Finalidade do serviço', text: 'O Valora oferece ferramentas para organizar uma carteira e consultar indicadores, cálculos e estimativas. Não é uma corretora e não executa ordens de compra, venda ou resgate. Os lançamentos registrados no aplicativo representam informações da sua carteira.' },
      { title: 'Sua conta', text: 'Mantenha os dados de cadastro atualizados e proteja suas credenciais. Você é responsável pelos dados e movimentos que registra. Se suspeitar de acesso indevido, altere sua senha pelos recursos de recuperação e entre em contato com a equipe.' },
      { title: 'Indicadores e estimativas', text: 'Cotações e indicadores podem ter atraso, lacunas ou correções. O histórico depende dos registros disponíveis. Estimativas de renda fixa não equivalem ao valor líquido de resgate ou à marcação a mercado. Confira os dados com seus extratos e com as fontes antes de tomar decisões.' },
      { title: 'Decisões de investimento', text: 'Scores, alertas e preços estimados não constituem recomendação individual de investimento nem garantia de retorno. As decisões de investimento e a avaliação dos riscos cabem ao usuário, que pode buscar orientação profissional conforme sua necessidade.' },
      { title: 'Uso adequado', text: 'Não utilize o serviço para acessar dados de outras pessoas sem autorização, compartilhar credenciais indevidamente, tentar contornar controles de acesso ou interferir na disponibilidade do aplicativo.' },
      { title: 'Disponibilidade e evolução', text: 'O serviço pode receber atualizações e passar por períodos de manutenção ou indisponibilidade. Guarde seus extratos e documentos originais; os registros do Valora não substituem os documentos das instituições financeiras.' },
      { title: 'Privacidade e contato', text: `O tratamento de dados é descrito na Política de Privacidade. Para dúvidas, problemas de acesso ou solicitações sobre sua conta, contate ${contact}. Estes termos não afastam direitos assegurados pela legislação aplicável.` },
    ],
  },
}

export function PublicInfoPage({ page }: { page: Page }) {
  const document = content[page]
  return <main className="min-h-dvh bg-[#111315] px-6 py-8 text-white sm:px-10">
    <div className="mx-auto max-w-3xl">
      <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <Link to="/sobre" className="flex items-center gap-2 font-semibold tracking-widest"><img src="/icons/valora-512.png" alt="" className="h-8 w-8 rounded-lg" />VALORA</Link>
        <nav aria-label="Navegação pública" className="flex gap-4 text-sm"><Link to="/login" className="text-white/70 hover:text-white">Entrar</Link><Link to="/cadastro" className="text-nf-blue hover:underline">Criar conta</Link></nav>
      </header>
      <article>
        <h1 className="text-3xl font-semibold sm:text-4xl">{document.title}</h1>
        <p className="mt-4 leading-relaxed text-white/65">{document.description}</p>
        {page !== 'about' && <p className="mt-3 text-xs text-white/40">Versão de 25 de outubro de 2026.</p>}
        <div className="mt-10 space-y-8">{document.sections.map((section) => <section key={section.title}><h2 className="mb-3 text-lg font-semibold">{section.title}</h2><p className="text-sm leading-7 text-white/70">{section.text}</p></section>)}</div>
      </article>
      <footer className="mt-14 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-6 text-sm text-white/55" aria-label="Informações do Valora">
        <Link to="/sobre" className="hover:text-white">Sobre o Valora</Link><Link to="/privacidade" className="hover:text-white">Política de Privacidade</Link><Link to="/termos" className="hover:text-white">Termos de Uso</Link><a href={`mailto:${contact}`} className="hover:text-white">Contato</a>
      </footer>
    </div>
  </main>
}

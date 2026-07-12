import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type TocItem } from "@/components/LegalPage";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  PRIVACY_POLICY_VERSION,
} from "@/lib/legal";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Lacto Control" },
      {
        name: "description",
        content:
          "Política de Privacidade do Lacto Control, em conformidade com a LGPD (Lei nº 13.709/2018).",
      },
      { property: "og:title", content: "Política de Privacidade — Lacto Control" },
      {
        property: "og:description",
        content:
          "Como o Lacto Control coleta, utiliza e protege dados pessoais, conforme a LGPD.",
      },
    ],
  }),
  component: PrivacyPage,
});

const toc: TocItem[] = [
  { id: "introducao", label: "1. Introdução" },
  { id: "dados", label: "2. Dados coletados" },
  { id: "finalidade", label: "3. Finalidade" },
  { id: "compartilhamento", label: "4. Compartilhamento" },
  { id: "seguranca", label: "5. Segurança" },
  { id: "direitos", label: "6. Direitos do titular" },
  { id: "cookies", label: "7. Cookies" },
  { id: "retencao", label: "8. Retenção" },
  { id: "contato", label: "9. Contato" },
  { id: "atualizacoes", label: "10. Atualizações" },
];

function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" version={PRIVACY_POLICY_VERSION} toc={toc}>
      <section id="introducao">
        <h2>1. Introdução</h2>
        <p>
          O <strong>Lacto Control</strong> é um sistema web voltado ao cadastro e
          acompanhamento do ciclo de lactação de vacas leiteiras e ao controle vacinal do
          rebanho. Esta Política de Privacidade descreve, de forma clara e transparente,
          como coletamos, utilizamos, armazenamos e protegemos os dados pessoais dos
          nossos usuários, em conformidade com a <strong>Lei Geral de Proteção de Dados
          Pessoais — LGPD (Lei nº 13.709/2018)</strong>.
        </p>
        <p>
          Ao utilizar o Lacto Control, o usuário declara estar ciente das práticas
          descritas neste documento.
        </p>
      </section>

      <section id="dados">
        <h2>2. Dados coletados</h2>
        <p>O Lacto Control poderá coletar, quando aplicável, os seguintes dados:</p>
        <ul>
          <li>Nome completo</li>
          <li>E-mail</li>
          <li>Telefone</li>
          <li>Nome da fazenda / propriedade rural</li>
          <li>Dados cadastrais complementares informados pelo usuário</li>
          <li>Informações do rebanho (identificação, raça, datas, status reprodutivo)</li>
          <li>Dados de produção de leite</li>
          <li>Histórico vacinal e sanitário dos animais</li>
          <li>Dados de acesso (data e hora de login, ações realizadas)</li>
          <li>Endereço IP</li>
          <li>Informações técnicas do navegador e do dispositivo</li>
          <li>Cookies essenciais ao funcionamento da aplicação</li>
        </ul>
      </section>

      <section id="finalidade">
        <h2>3. Finalidade</h2>
        <p>Os dados coletados são utilizados para:</p>
        <ul>
          <li>Autenticação e identificação do usuário;</li>
          <li>Funcionamento adequado do sistema;</li>
          <li>Gerenciamento da propriedade rural e do rebanho;</li>
          <li>Emissão de relatórios e indicadores;</li>
          <li>Melhoria contínua da plataforma;</li>
          <li>Prestação de suporte técnico;</li>
          <li>Garantia da segurança da aplicação;</li>
          <li>Prevenção de fraudes e uso indevido.</li>
        </ul>
      </section>

      <section id="compartilhamento">
        <h2>4. Compartilhamento</h2>
        <p>
          Os dados pessoais dos usuários <strong>não são comercializados</strong>. O
          compartilhamento ocorrerá exclusivamente:
        </p>
        <ul>
          <li>Quando exigido por determinação legal ou judicial;</li>
          <li>Para viabilizar a prestação do serviço, junto a provedores estritamente necessários (por exemplo, provedores de infraestrutura em nuvem e autenticação).</li>
        </ul>
      </section>

      <section id="seguranca">
        <h2>5. Segurança</h2>
        <p>O Lacto Control adota medidas técnicas e organizacionais para proteger os dados, incluindo:</p>
        <ul>
          <li>Autenticação de usuários;</li>
          <li>Criptografia em trânsito e, quando aplicável, em repouso;</li>
          <li>Controle de acesso baseado em perfil e propriedade rural;</li>
          <li><em>Row Level Security</em> (RLS) no banco de dados;</li>
          <li>Infraestrutura segura fornecida pelo Lovable Cloud / Supabase;</li>
          <li>Boas práticas de segurança da informação.</li>
        </ul>
      </section>

      <section id="direitos">
        <h2>6. Direitos do titular</h2>
        <p>Nos termos da LGPD, o titular dos dados tem direito a:</p>
        <ul>
          <li>Confirmação da existência de tratamento;</li>
          <li>Acesso aos dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
          <li>Portabilidade dos dados, quando aplicável;</li>
          <li>Eliminação dos dados tratados com base no consentimento, observadas as obrigações legais de guarda;</li>
          <li>Revogação do consentimento, a qualquer momento.</li>
        </ul>
        <p>
          Para exercer esses direitos, entre em contato pelos canais indicados na seção
          <a href="#contato"> Contato</a>.
        </p>
      </section>

      <section id="cookies">
        <h2>7. Cookies</h2>
        <p>
          Utilizamos apenas cookies necessários ao funcionamento do sistema (por exemplo,
          manutenção da sessão autenticada). Caso, no futuro, sejam adotados cookies
          analíticos ou de desempenho, o usuário será previamente informado.
        </p>
      </section>

      <section id="retencao">
        <h2>8. Retenção</h2>
        <p>
          Os dados serão mantidos apenas pelo período necessário à prestação do serviço e
          ao cumprimento de eventuais obrigações legais, regulatórias ou contratuais.
          Após esse período, os dados poderão ser eliminados ou anonimizados.
        </p>
      </section>

      <section id="contato">
        <h2>9. Contato</h2>
        <p>Para dúvidas, solicitações ou exercício de direitos previstos na LGPD:</p>
        <ul>
          <li><strong>E-mail:</strong> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
          <li><strong>Telefone:</strong> {CONTACT_PHONE}</li>
          <li><strong>Endereço:</strong> {CONTACT_ADDRESS}</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          <em>
            Observação: os dados de contato acima são <strong>placeholders</strong> e devem
            ser substituídos pelas informações oficiais do responsável pelo tratamento
            antes da publicação em produção.
          </em>
        </p>
      </section>

      <section id="atualizacoes">
        <h2>10. Atualizações</h2>
        <p>
          Esta Política poderá ser atualizada periodicamente para refletir mudanças
          legais, técnicas ou operacionais. A data da última atualização e a versão
          vigente estão indicadas no topo deste documento. Recomendamos consultá-la
          regularmente.
        </p>
      </section>
    </LegalPage>
  );
}

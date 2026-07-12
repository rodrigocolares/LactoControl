import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type TocItem } from "@/components/LegalPage";
import { CONTACT_EMAIL, TERMS_VERSION } from "@/lib/legal";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Lacto Control" },
      {
        name: "description",
        content:
          "Termos de Uso do Lacto Control: regras para cadastro, utilização e responsabilidades.",
      },
      { property: "og:title", content: "Termos de Uso — Lacto Control" },
      {
        property: "og:description",
        content:
          "Condições gerais de uso do Lacto Control, sistema de gestão da produção leiteira.",
      },
    ],
  }),
  component: TermsPage,
});

const toc: TocItem[] = [
  { id: "objeto", label: "1. Objeto" },
  { id: "cadastro", label: "2. Cadastro" },
  { id: "responsabilidade", label: "3. Responsabilidade do usuário" },
  { id: "uso", label: "4. Uso permitido" },
  { id: "propriedade", label: "5. Propriedade intelectual" },
  { id: "disponibilidade", label: "6. Disponibilidade" },
  { id: "limitacao", label: "7. Limitação de responsabilidade" },
  { id: "encerramento", label: "8. Encerramento de conta" },
  { id: "alteracoes", label: "9. Alterações" },
  { id: "legislacao", label: "10. Legislação" },
];

function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" version={TERMS_VERSION} toc={toc}>
      <section id="objeto">
        <h2>1. Objeto</h2>
        <p>
          O <strong>Lacto Control</strong> é uma plataforma web destinada ao cadastro e
          acompanhamento do ciclo de lactação de vacas leiteiras, incluindo módulos de
          controle vacinal, registro de produção, relatórios e indicadores. Estes Termos
          de Uso regulam a utilização do sistema pelos usuários cadastrados.
        </p>
      </section>

      <section id="cadastro">
        <h2>2. Cadastro</h2>
        <p>
          O uso do sistema exige cadastro prévio, mediante o fornecimento de informações
          verdadeiras, completas e atualizadas. O usuário é responsável por manter seus
          dados cadastrais atualizados e por preservar a confidencialidade de suas
          credenciais de acesso.
        </p>
      </section>

      <section id="responsabilidade">
        <h2>3. Responsabilidade do usuário</h2>
        <p>O usuário compromete-se a:</p>
        <ul>
          <li>Manter sua senha em sigilo e não compartilhá-la com terceiros;</li>
          <li>Fornecer informações verdadeiras e precisas no cadastro e nos registros;</li>
          <li>Utilizar o sistema exclusivamente de forma lícita, ética e em conformidade com estes Termos.</li>
        </ul>
      </section>

      <section id="uso">
        <h2>4. Uso permitido</h2>
        <p>
          O Lacto Control destina-se ao gerenciamento da produção leiteira e do rebanho.
          É vedada qualquer utilização estranha a essa finalidade, incluindo tentativas
          de acesso indevido, engenharia reversa, sobrecarga do sistema ou atividades
          que violem direitos de terceiros.
        </p>
      </section>

      <section id="propriedade">
        <h2>5. Propriedade intelectual</h2>
        <p>
          O software, layout, marca, logotipo, textos e código-fonte pertencem ao Lacto
          Control (ou ao seu titular), sendo protegidos pela legislação de propriedade
          intelectual aplicável. Componentes de terceiros são utilizados sob suas
          respectivas licenças.
        </p>
      </section>

      <section id="disponibilidade">
        <h2>6. Disponibilidade</h2>
        <p>
          Envidamos esforços razoáveis para manter o sistema disponível. Contudo, poderão
          ocorrer interrupções programadas para manutenção, atualizações ou por motivos
          alheios ao nosso controle. Não garantimos disponibilidade ininterrupta.
        </p>
      </section>

      <section id="limitacao">
        <h2>7. Limitação de responsabilidade</h2>
        <p>
          O Lacto Control é uma <strong>ferramenta auxiliar</strong> de gestão. Decisões
          técnicas, veterinárias, zootécnicas, sanitárias ou financeiras baseadas nas
          informações do sistema são de <strong>responsabilidade exclusiva do usuário</strong>,
          que deve validá-las com profissionais qualificados quando cabível.
        </p>
      </section>

      <section id="encerramento">
        <h2>8. Encerramento de conta</h2>
        <p>
          A conta poderá ser encerrada:
        </p>
        <ul>
          <li>Mediante solicitação do usuário;</li>
          <li>Em caso de descumprimento destes Termos;</li>
          <li>Em situações previstas por lei ou por determinação judicial.</li>
        </ul>
      </section>

      <section id="alteracoes">
        <h2>9. Alterações</h2>
        <p>
          Estes Termos podem ser atualizados a qualquer momento. A versão vigente e a
          data da última atualização estão indicadas no topo deste documento. A
          continuidade do uso após alterações implica aceitação das novas condições.
        </p>
      </section>

      <section id="legislacao">
        <h2>10. Legislação</h2>
        <p>
          Estes Termos são regidos pela legislação brasileira, em especial pelo Código
          Civil, Código de Defesa do Consumidor (quando aplicável), Marco Civil da
          Internet (Lei nº 12.965/2014) e Lei Geral de Proteção de Dados Pessoais (Lei
          nº 13.709/2018). Dúvidas podem ser encaminhadas para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}

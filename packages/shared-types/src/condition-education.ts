/**
 * Conteúdo educativo exibido no modal de detalhe de uma condição de saúde
 * (tela Minha Saúde, seções "Problemas e condições" e "Condições de saúde
 * autorreferidas") — texto genérico de orientação pública, não é
 * aconselhamento médico individualizado. Classificado por palavra-chave a
 * partir do `label` que já vem da API (mesmo padrão dos outros
 * classificadores do app), já que o rótulo pode variar um pouco entre
 * fontes (ex. "Hipertensão" vs "Hipertensão arterial", "Derrame" vs
 * "AVC / Derrame").
 */
export type ConditionCategory =
  | "hipertensao"
  | "diabetes"
  | "cancer"
  | "derrame"
  | "infarto"
  | "doenca_cardiaca"
  | "problema_rins"
  | "doenca_respiratoria"
  | "tuberculose"
  | "hanseniase"
  | "saude_mental"
  | "fumante"
  | "uso_alcool"
  | "outro";

export interface ConditionEducationContent {
  whatIsIt: string;
  risks: string;
  care: string;
  avoid: string;
}

export function classifyConditionCategory(label: string): ConditionCategory {
  const normalized = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

  if (/HIPERTENS/.test(normalized)) return "hipertensao";
  if (/DIABETES/.test(normalized)) return "diabetes";
  if (/CANCER/.test(normalized)) return "cancer";
  if (/DERRAME|\bAVC\b/.test(normalized)) return "derrame";
  if (/INFARTO/.test(normalized)) return "infarto";
  if (/CARDIAC/.test(normalized)) return "doenca_cardiaca";
  if (/\bRIM\b|\bRINS\b/.test(normalized)) return "problema_rins";
  if (/RESPIRATOR|PULMAO/.test(normalized)) return "doenca_respiratoria";
  if (/TUBERCULOSE/.test(normalized)) return "tuberculose";
  if (/HANSENIASE/.test(normalized)) return "hanseniase";
  if (/MENTAL/.test(normalized)) return "saude_mental";
  if (/FUMANTE|TABAG/.test(normalized)) return "fumante";
  if (/ALCOOL/.test(normalized)) return "uso_alcool";
  return "outro";
}

export const CONDITION_EDUCATION: Record<ConditionCategory, ConditionEducationContent> = {
  hipertensao: {
    whatIsIt:
      "A pressão do sangue nas artérias fica alta com frequência, forçando o coração e os vasos sanguíneos a trabalharem mais do que deveriam.",
    risks:
      "Quando não controlada por muito tempo, aumenta o risco de infarto, AVC (derrame), problemas nos rins e na visão — geralmente sem dar sintomas até que algo mais sério aconteça.",
    care:
      "Meça a pressão regularmente, tome os medicamentos exatamente como o profissional de saúde orientou, mesmo sem sentir nada, e compareça às consultas de acompanhamento.",
    avoid:
      "Evite excesso de sal, sedentarismo, bebida alcoólica e parar os remédios por conta própria mesmo que a pressão esteja normal.",
  },
  diabetes: {
    whatIsIt:
      "O nível de açúcar (glicose) no sangue fica alto porque o corpo não produz ou não usa bem a insulina, o hormônio que controla essa glicose.",
    risks:
      "Glicose alta por muito tempo pode prejudicar o coração, os rins, a visão e a circulação dos pés, aumentando o risco de feridas que demoram a cicatrizar.",
    care:
      "Siga a alimentação e os medicamentos orientados pelo profissional de saúde, monitore a glicemia quando indicado, cuide bem dos pés e faça os exames de acompanhamento regularmente.",
    avoid:
      "Evite açúcar e alimentos ultraprocessados em excesso, pular refeições sem orientação e andar descalço, já que pequenos ferimentos nos pés podem complicar.",
  },
  cancer: {
    whatIsIt:
      "Crescimento anormal de células no corpo, que pode acontecer em diferentes órgãos ou tecidos.",
    risks:
      "O risco e a gravidade variam muito conforme o tipo e o quanto cedo é identificado — por isso o acompanhamento regular com a equipe de saúde é importante.",
    care:
      "Mantenha as consultas, exames de acompanhamento e tratamentos indicados pela equipe que cuida do seu caso, e relate qualquer sintoma novo o quanto antes.",
    avoid:
      "Evite interromper o tratamento ou os exames de acompanhamento por conta própria, mesmo que esteja se sentindo bem.",
  },
  derrame: {
    whatIsIt:
      "O AVC (Acidente Vascular Cerebral), também chamado de derrame, acontece quando o fluxo de sangue para uma parte do cérebro é interrompido ou há um sangramento no cérebro.",
    risks:
      "Pode deixar sequelas como dificuldade para falar, enxergar, mover um lado do corpo ou raciocinar, dependendo da área afetada e da rapidez do atendimento.",
    care:
      "Se já teve um AVC, siga à risca o tratamento e as consultas de acompanhamento — controlar pressão, diabetes e colesterol ajuda a prevenir um novo episódio.",
    avoid:
      "Se notar de repente boca torta, fraqueza num lado do corpo ou dificuldade pra falar (em você ou em alguém perto), não espere: procure atendimento de urgência imediatamente.",
  },
  infarto: {
    whatIsIt:
      "O infarto acontece quando o fluxo de sangue para uma parte do coração é bloqueado, geralmente por um entupimento nas artérias.",
    risks:
      "Pode causar dano permanente ao músculo do coração; quem já teve um infarto tem risco maior de ter outro se os fatores de risco não forem controlados.",
    care:
      "Siga o tratamento e as consultas de acompanhamento, e converse com a equipe de saúde sobre atividade física segura para o seu caso.",
    avoid:
      "Evite fumar, o sedentarismo e interromper os medicamentos por conta própria mesmo sem sintomas.",
  },
  doenca_cardiaca: {
    whatIsIt:
      "Termo geral para problemas que afetam o funcionamento do coração, como alterações no ritmo, nas válvulas ou na capacidade de bombear sangue.",
    risks:
      "Pode evoluir causando cansaço, falta de ar e inchaço nas pernas, e aumenta o risco de complicações mais sérias se não for acompanhado.",
    care:
      "Mantenha as consultas e exames de acompanhamento em dia, siga a medicação conforme orientado e informe a equipe de saúde sobre qualquer novo sintoma.",
    avoid:
      "Evite esforços físicos intensos sem orientação médica e o uso de medicamentos ou suplementos sem converser antes com a equipe de saúde.",
  },
  problema_rins: {
    whatIsIt:
      "Alteração no funcionamento dos rins, que são responsáveis por filtrar o sangue e eliminar o excesso de líquido e toxinas do corpo.",
    risks:
      "Quando não identificado e acompanhado, pode evoluir para perda progressiva da função renal, exigindo tratamentos mais complexos no futuro.",
    care:
      "Controle bem a pressão e a diabetes (se tiver), siga a orientação de líquidos e alimentação dada pela equipe de saúde, e mantenha os exames de acompanhamento em dia.",
    avoid:
      "Evite usar anti-inflamatórios ou outros remédios por conta própria sem orientação, já que alguns medicamentos podem sobrecarregar os rins.",
  },
  doenca_respiratoria: {
    whatIsIt:
      "Condições que afetam a respiração e o funcionamento dos pulmões, como bronquite crônica, asma ou outras doenças pulmonares.",
    risks:
      "Crises podem causar falta de ar importante, e infecções respiratórias tendem a ser mais sérias em quem já tem uma doença pulmonar de base.",
    care:
      "Use a medicação conforme orientado, mesmo nos períodos sem sintomas, e mantenha as vacinas (como gripe) em dia conforme indicação da equipe de saúde.",
    avoid:
      "Evite fumar, ambientes com fumaça ou poeira, e parar o tratamento de manutenção só porque está se sentindo melhor.",
  },
  tuberculose: {
    whatIsIt:
      "Doença infecciosa causada por uma bactéria que afeta principalmente os pulmões, transmitida pelo ar.",
    risks:
      "Se o tratamento for interrompido antes do tempo, a doença pode voltar de forma mais resistente aos medicamentos, além de continuar transmitindo a outras pessoas.",
    care:
      "Tome a medicação todos os dias pelo tempo completo indicado pela equipe de saúde, mesmo depois que os sintomas melhorarem, e compareça ao acompanhamento.",
    avoid:
      "Nunca interrompa o tratamento por conta própria, mesmo sentindo-se bem — é a causa mais comum de a doença voltar mais difícil de tratar.",
  },
  hanseniase: {
    whatIsIt:
      "Doença infecciosa que afeta principalmente a pele e os nervos, causada por uma bactéria de transmissão lenta.",
    risks:
      "Sem tratamento, pode causar perda de sensibilidade e lesões nos nervos, mãos, pés e olhos, que podem deixar sequelas.",
    care:
      "Siga o tratamento completo conforme orientado — é gratuito pelo SUS — e faça o acompanhamento para identificar cedo qualquer alteração na pele ou sensibilidade.",
    avoid:
      "Evite interromper o tratamento antes do tempo recomendado, mesmo com melhora das manchas na pele.",
  },
  saude_mental: {
    whatIsIt:
      "Inclui diferentes condições que afetam o bem-estar emocional, os pensamentos e o comportamento, como ansiedade, depressão e outras.",
    risks:
      "Sem acompanhamento, pode afetar o sono, o apetite, as relações e a capacidade de realizar atividades do dia a dia.",
    care:
      "Mantenha o acompanhamento com a equipe de saúde, converse abertamente sobre como está se sentindo e siga o tratamento indicado.",
    avoid:
      "Evite se isolar e interromper o tratamento ou a medicação por conta própria, mesmo quando estiver se sentindo melhor.",
  },
  fumante: {
    whatIsIt: "Uso de cigarro ou outros produtos de tabaco de forma regular.",
    risks:
      "Aumenta significativamente o risco de doenças do coração, AVC, câncer e doenças respiratórias, além de agravar outras condições de saúde.",
    care:
      "Procure sua unidade de saúde para apoio e orientação sobre como parar de fumar — o SUS oferece acompanhamento gratuito para isso.",
    avoid: "Evite ambientes fechados com fumaça, inclusive pra quem está ao seu redor.",
  },
  uso_alcool: {
    whatIsIt: "Consumo de bebidas alcoólicas de forma regular.",
    risks:
      "O uso frequente ou em excesso pode afetar o fígado, a pressão arterial, a saúde mental e piorar outras condições de saúde.",
    care:
      "Converse com a equipe de saúde sobre seus hábitos de consumo — eles podem orientar e, se necessário, encaminhar para apoio especializado.",
    avoid: "Evite combinar álcool com medicamentos sem orientação, e dirigir após consumir bebida alcoólica.",
  },
  outro: {
    whatIsIt: "Condição de saúde registrada no seu cadastro.",
    risks: "Os riscos variam de pessoa para pessoa — converse com a equipe de saúde para entender o que isso significa no seu caso.",
    care: "Mantenha o acompanhamento com a equipe de saúde da sua unidade para orientações específicas sobre esta condição.",
    avoid: "Evite tomar decisões sobre tratamento sem conversar antes com um profissional de saúde.",
  },
};

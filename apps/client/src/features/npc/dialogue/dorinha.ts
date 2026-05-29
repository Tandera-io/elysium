/** Quick-reply button shown in the dialogue UI before the player types anything. */
export interface DorinhaQuickReply {
  label: string;
  input: string;
}

const DORINHA_DIALOGUE = {
  npcId: 'dorinha' as const,
  greetings: [
    {
      label: 'Quero vender minhas culturas',
      input: 'Quero vender minhas culturas hoje. Quanto você paga por elas?',
    },
    {
      label: 'Comprar sementes',
      input: 'O que você tem de sementes disponíveis? Quero comprar.',
    },
    {
      label: 'Quais são os preços?',
      input: 'Quais são os preços das suas sementes e culturas hoje?',
    },
    {
      label: 'Trocar produtos',
      input: 'Posso trocar minhas culturas por sementes diferentes?',
    },
  ] satisfies DorinhaQuickReply[],
};

export default DORINHA_DIALOGUE;

export interface Tool {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  priceWei: string;
  route: string;
  hasFreeMode?: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: 1,
    slug: 'chat',
    name: 'Chat',
    description: 'Ask anything. General AI assistant.',
    price: '0.005',
    priceWei: '5000000000000000',
    route: '/app/chat',
  },
  {
    id: 2,
    slug: 'tweet',
    name: 'Tweet',
    description: 'Turn a thought or journal entry into a viral tweet.',
    price: '0.005',
    priceWei: '5000000000000000',
    route: '/app/tweet',
  },
  {
    id: 3,
    slug: 'reflect',
    name: 'Reflect',
    description: 'AI reads your recent entries and writes a personal reflection.',
    price: '0.005',
    priceWei: '5000000000000000',
    route: '/app/reflect',
  },
  {
    id: 4,
    slug: 'pattern',
    name: 'Pattern',
    description: 'Discover emotional patterns across all your journal entries.',
    price: '0.005',
    priceWei: '5000000000000000',
    route: '/app/pattern',
  },
  {
    id: 5,
    slug: 'letter',
    name: 'Letter',
    description: 'Write a letter and send it. AI polish optional.',
    price: '0.01',
    priceWei: '10000000000000000',
    route: '/app/letter',
    hasFreeMode: true,
  },
];

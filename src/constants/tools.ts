export const TOOLS = {
  CHAT: {
    id: 0,
    name: 'AI Chat',
    price: '0.01',
    placeholder: 'Ask me anything...',
    systemPrompt: 'You are a helpful AI assistant. Be concise and professional.',
  },
  RESUME: {
    id: 1,
    name: 'Resume Gen',
    price: '0.05',
    placeholder: 'Summarize your professional experience...',
    systemPrompt: 'Format this professional experience into a clean, modern text resume.',
  },
  TWEET: {
    id: 2,
    name: 'Tweet Gen',
    price: '0.01',
    placeholder: 'What is your tweet about?',
    systemPrompt: 'Transform this idea into a viral tweet. Maximum 280 characters.',
  },
  BIO: {
    id: 3,
    name: 'Bio Gen',
    price: '0.02',
    placeholder: 'Tell me about yourself...',
    systemPrompt: 'Write a professional bio based on these keywords.',
  },
} as const;

export type ToolKey = keyof typeof TOOLS;

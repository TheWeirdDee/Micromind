export interface PromptItem {
  id: string;
  text: string;
}

export const THERAPEUTIC_PROMPTS: Record<string, PromptItem[]> = {
  happy: [
    { id: 'h1', text: 'What contributed to your happiness today? How can you invite more of this into your week?' },
    { id: 'h2', text: 'Describe a single moment of joy from today in vivid detail—what did you see, hear, and feel?' },
    { id: 'h3', text: 'What is a personal win or breakthrough you experienced today, no matter how small?' }
  ],
  excited: [
    { id: 'e1', text: 'What are you looking forward to most right now? What makes it feel so meaningful?' },
    { id: 'e2', text: 'You have a lot of positive energy right now. How can you channel it into something you care about?' },
    { id: 'e3', text: 'What new idea, project, or opportunity is sparking your curiosity today?' }
  ],
  neutral: [
    { id: 'n1', text: 'Check in with your mind and body. What is one physical sensation and one quiet thought you notice?' },
    { id: 'n2', text: 'Write a purely factual summary of your day—no judgements, just the events as they happened.' },
    { id: 'n3', text: 'What is a small, quiet detail of your environment today that usually goes unnoticed?' }
  ],
  sad: [
    { id: 's1', text: 'Let yourself feel. Describe the sadness without trying to fix it. Where in your body do you feel it?' },
    { id: 's2', text: 'If this sadness was a messenger trying to tell you about something you deeply care about, what would it be?' },
    { id: 's3', text: 'What is one gentle, tiny act of comfort or self-care you can offer yourself today?' }
  ],
  angry: [
    { id: 'a1', text: 'What boundary of yours was crossed today? Write out your raw thoughts to vent the energy.' },
    { id: 'a2', text: 'Anger is often a secondary emotion protecting a softer feeling like hurt or fear. What lies underneath?' },
    { id: 'a3', text: 'What part of this frustrating situation is in your control, and what parts must you let go of?' }
  ]
};

export const DEFAULT_PROMPTS: PromptItem[] = [
  { id: 'd1', text: 'Write freely about whatever is on your mind right now. Let your thoughts flow.' },
  { id: 'd2', text: 'What did you learn about yourself or others today?' },
  { id: 'd3', text: 'List three things you are genuinely grateful for today, and why.' }
];

/**
 * Seeding data for Clarity Quest.
 * Contains 10 levels, each representing a category with an increasing number of stages.
 */

export interface QuestStage {
  id: string; // e.g. "l1-s1"
  sentence: string; // E.g., "The weather was really {placeholder}."
  placeholderKey: string; // E.g., "placeholder"
  targetWord: string; // E.g., "REJUVENATING"
  scrambledLetters: string[]; // Letters of targetWord + distractor letters
  clue: string; // Static standard clue
  vocabulary: {
    definition: string;
    similarWords: Array<{ word: string; meaning: string }>;
  };
}

export interface QuestLevel {
  levelNumber: number;
  name: string;
  category: string;
  stages: QuestStage[];
}

export const QUEST_LEVELS: QuestLevel[] = [
  {
    levelNumber: 1,
    name: 'Beginner Gratitude',
    category: 'Daily Gratitude',
    stages: [
      {
        id: 'l1-s1',
        sentence: 'Spending time in the quiet forest felt truly {placeholder} after a long week.',
        placeholderKey: 'placeholder',
        targetWord: 'REJUVENATING',
        scrambledLetters: ['R', 'E', 'J', 'U', 'V', 'E', 'N', 'A', 'T', 'I', 'N', 'G', 'B', 'P'],
        clue: 'Giving new energy or vigor; restoring youthfulness.',
        vocabulary: {
          definition: 'More than pleasant; it restores your energy and helps you feel renewed.',
          similarWords: [
            { word: 'Restorative', meaning: 'Helps recover energy and calm after stress.' },
            { word: 'Refreshing', meaning: 'Brings a bright, renewing feeling to the mind or body.' },
            { word: 'Revitalizing', meaning: 'Restores strength and makes your spirit feel alive again.' },
          ],
        },
      },
      {
        id: 'l1-s2',
        sentence: 'I am extremely {placeholder} for the support my neighbor gave me during the move.',
        placeholderKey: 'placeholder',
        targetWord: 'APPRECIATIVE',
        scrambledLetters: ['A', 'P', 'P', 'R', 'E', 'C', 'I', 'A', 'T', 'I', 'V', 'E', 'X', 'O'],
        clue: 'Feeling or showing gratitude or pleasure.',
        vocabulary: {
          definition: 'Recognizing kindness or value with warmth. It helps you see support clearly.',
          similarWords: [
            { word: 'Grateful', meaning: 'Feeling thankful for what someone has done for you.' },
            { word: 'Thankful', meaning: 'Appreciating a positive kindness or moment in your life.' },
            { word: 'Acknowledging', meaning: 'Noticing and valuing what was offered or given.' },
          ],
        },
      },
      {
        id: 'l1-s3',
        sentence: 'The simple dinner with my old family friends was deeply {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'NOURISHING',
        scrambledLetters: ['N', 'O', 'U', 'R', 'I', 'S', 'H', 'I', 'N', 'G', 'L', 'K'],
        clue: 'Providing the substances necessary for growth, health, and good condition.',
        vocabulary: {
          definition: 'More than satisfying. A nourishing experience restores your emotional energy.',
          similarWords: [
            { word: 'Restorative', meaning: 'Supports recovery and renewal after feeling drained.' },
            { word: 'Comforting', meaning: 'Brings ease and warmth when your emotions feel raw.' },
            { word: 'Healing', meaning: 'Helps mend your inner state so you feel steadier and softer.' },
          ],
        },
      }
    ]
  },
  {
    levelNumber: 2,
    name: 'Emotional Awareness',
    category: 'Emotional Clarity',
    stages: [
      {
        id: 'l2-s1',
        sentence: 'After the sudden cancellation of the project, I felt completely {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'DISORIENTED',
        scrambledLetters: ['D', 'I', 'S', 'O', 'R', 'I', 'E', 'N', 'T', 'E', 'D', 'M', 'W'],
        clue: 'Make someone lose their sense of direction or position.'
      },
      {
        id: 'l2-s2',
        sentence: 'Seeing my childhood home after so many decades made me feel highly {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'NOSTALGIC',
        scrambledLetters: ['N', 'O', 'S', 'T', 'A', 'L', 'G', 'I', 'C', 'P', 'Q'],
        clue: 'Exhibiting a sentimental longing or wistful affection for the past.'
      },
      {
        id: 'l2-s3',
        sentence: 'I felt {placeholder} when they praised my work in front of the whole department.',
        placeholderKey: 'placeholder',
        targetWord: 'VALIDATED',
        scrambledLetters: ['V', 'A', 'L', 'I', 'D', 'A', 'T', 'E', 'D', 'S', 'T'],
        clue: 'Feeling recognized, worthy, or approved.'
      },
      {
        id: 'l2-s4',
        sentence: 'Waiting for the test results left me feeling incredibly {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'APPREHENSIVE',
        scrambledLetters: ['A', 'P', 'P', 'R', 'E', 'H', 'E', 'N', 'S', 'I', 'V', 'E', 'L', 'K'],
        clue: 'Anxious or fearful that something bad or unpleasant will happen.'
      },
      {
        id: 'l2-s5',
        sentence: 'Her warm apology left me feeling entirely {placeholder} and calm.',
        placeholderKey: 'placeholder',
        targetWord: 'REASSURED',
        scrambledLetters: ['R', 'E', 'A', 'S', 'S', 'U', 'R', 'E', 'D', 'A', 'B'],
        clue: 'Say or do something to remove the doubts or fears of someone.'
      }
    ]
  },
  {
    levelNumber: 3,
    name: 'Workplace Diplomacy',
    category: 'Professional Edge',
    stages: [
      {
        id: 'l3-s1',
        sentence: 'Instead of apologizing for making a basic request, I should be more {placeholder} in my emails.',
        placeholderKey: 'placeholder',
        targetWord: 'ASSERTIVE',
        scrambledLetters: ['A', 'S', 'S', 'E', 'R', 'T', 'I', 'V', 'E', 'M', 'N', 'Z'],
        clue: 'Having or showing a confident and forceful personality.'
      },
      {
        id: 'l3-s2',
        sentence: 'Handling the customer dispute required a highly {placeholder} approach.',
        placeholderKey: 'placeholder',
        targetWord: 'DIPLOMATIC',
        scrambledLetters: ['D', 'I', 'P', 'L', 'O', 'M', 'A', 'T', 'I', 'C', 'X', 'Y'],
        clue: 'Tactful and sensitive in dealing with people and difficult situations.'
      },
      {
        id: 'l3-s3',
        sentence: 'To work well in this remote team, we must build a highly {placeholder} environment.',
        placeholderKey: 'placeholder',
        targetWord: 'COLLABORATIVE',
        scrambledLetters: ['C', 'O', 'L', 'L', 'A', 'B', 'O', 'R', 'A', 'T', 'I', 'V', 'E', 'S', 'P'],
        clue: 'Produced or conducted by two or more parties working together.'
      },
      {
        id: 'l3-s4',
        sentence: 'I will remain {placeholder} during the performance negotiation.',
        placeholderKey: 'placeholder',
        targetWord: 'COMPOSED',
        scrambledLetters: ['C', 'O', 'M', 'P', 'O', 'S', 'E', 'D', 'A', 'L'],
        clue: 'Calm and in control of oneself.'
      },
      {
        id: 'l3-s5',
        sentence: 'A good manager provides feedback that is direct but always {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'CONSTRUCTIVE',
        scrambledLetters: ['C', 'O', 'N', 'S', 'T', 'R', 'U', 'C', 'T', 'I', 'V', 'E', 'M', 'O'],
        clue: 'Serving a useful purpose; tending to build up.'
      },
      {
        id: 'l3-s6',
        sentence: 'When explaining the server failure to clients, we must be fully {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'TRANSPARENT',
        scrambledLetters: ['T', 'R', 'A', 'N', 'S', 'P', 'A', 'R', 'E', 'N', 'T', 'K', 'L'],
        clue: 'Easy to perceive or detect; open and honest.'
      },
      {
        id: 'l3-s7',
        sentence: 'I decided to take a {placeholder} stance on the controversial board decision.',
        placeholderKey: 'placeholder',
        targetWord: 'PRAGMATIC',
        scrambledLetters: ['P', 'R', 'A', 'G', 'M', 'A', 'T', 'I', 'C', 'R', 'S'],
        clue: 'Dealing with things sensibly and realistically in a way that is based on practical considerations.'
      }
    ]
  },
  // Level 4 to 10 can be generated programmatically to prevent gigantic file sizes
  // but keeping a strict type-safe definition for each of the remaining levels.
  ...generateRemainingLevels()
];

function generateRemainingLevels(): QuestLevel[] {
  const categories = [
    { num: 4, name: 'Mental Presence', cat: 'Mindfulness & Focus', words: ['CENTERED', 'GROUNDED', 'FOCUSSED', 'MINDFUL', 'SERENE', 'PLACID', 'ATTENTIVE', 'BALANCED', 'ANCHORED'], template: 'In the middle of the storm, I felt fully {placeholder}.' },
    { num: 5, name: 'Inner Friend', cat: 'Self-Compassion', words: ['FORGIVING', 'ACCEPTING', 'PATIENT', 'GENTLE', 'TOLERANT', 'NURTURING', 'KINDHEARTED', 'LENIENT', 'COMPASSIONATE', 'BENEVOLENT', 'GRACIOUS'], template: 'I will try to be more {placeholder} with my mistakes.' },
    { num: 6, name: 'Social Harmony', cat: 'Social Connections', words: ['EMPATHETIC', 'SUPPORTIVE', 'CONNECTED', 'ATTUNED', 'HARMONIOUS', 'RECEPTIVE', 'GENEROUS', 'CONSIDERATE', 'SINCERE', 'AMICABLE', 'TRUSTWORTHY', 'DEVOTED', 'COMPANIONABLE'], template: 'Building deep relationships requires us to be {placeholder}.' },
    { num: 7, name: 'Action & Drive', cat: 'Goal & Action', words: ['DETERMINED', 'DILIGENT', 'RESOLUTE', 'MOTIVATED', 'PROACTIVE', 'PERSISTENT', 'AMBITIOUS', 'DISCIPLINED', 'EFFICIENT', 'RESOURCEFUL', 'INDUSTRIOUS', 'TENACIOUS', 'STEADFAST', 'UNWAVERING', 'ORGANIZED'], template: 'To achieve this difficult goal, I must remain {placeholder}.' },
    { num: 8, name: 'Creative Imagery', cat: 'Creative Spark', words: ['VIVID', 'LUMINOUS', 'INTRICATE', 'IMAGINATIVE', 'EVOCATIVE', 'EXPRESSIVE', 'POETIC', 'DRAMATIC', 'CAPTIVATING', 'ELEGANT', 'MAJESTIC', 'SPLENDID', 'SUBLIME', 'PROFOUND', 'ILLUSTRIOUS', 'SPELLBINDING', 'ENCHANTING'], template: 'The sunset painted a {placeholder} pattern across the sky.' },
    { num: 9, name: 'Unified Balance', cat: 'Professional & Social Blend', words: ['DIPLOMATIC', 'EMPATHETIC', 'ASSERTIVE', 'RESILIENT', 'COURTEOUS', 'VALIANT', 'RELIABLE', 'EQUITABLE', 'GENEROUS', 'SINCERE', 'PRAGMATIC', 'CONSTRUCTIVE', 'TRANSPARENT', 'NOURISHING', 'REASSURED', 'COMPOSED', 'BALANCED', 'GROUNDED', 'VIGILANT'], template: 'A good leader is always {placeholder} when resolving conflicts.' },
    { num: 10, name: 'Master Scribe', cat: 'Master Class', words: ['TRANSCENDENT', 'INTELLIGENT', 'PHILOSOPHICAL', 'INTUITIVE', 'INSPIRATIONAL', 'METICULOUS', 'EXTRAORDINARY', 'REVOLUTIONARY', 'EXEMPLARY', 'UNPRECEDENTED', 'ACCOMPLISHED', 'PERSPECUOUS', 'SOPHISTICATED', 'MAGNANIMOUS', 'CONSCIENTIOUS', 'PERSEVERING', 'AUTHENTIC', 'EQUITABLE', 'BENEFICENT', 'KNOWLEDGEABLE', 'CLARIFIED'], template: 'The final journal entry was written in a {placeholder} voice.' }
  ];

  return categories.map(c => {
    const stageCount = c.num * 2 + 1; // L4=9, L5=11, L6=13, L7=15, L8=17, L9=19, L10=21
    const stages: QuestStage[] = [];

    for (let s = 1; s <= stageCount; s++) {
      // Pick word cyclically from the list to avoid overflow
      const targetWord = c.words[(s - 1) % c.words.length];
      
      // Build scrambled array (targetWord letters + random fillers)
      const lettersSet = new Set(targetWord.split(''));
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      while (lettersSet.size < Math.max(12, targetWord.length + 3)) {
        lettersSet.add(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }

      stages.push({
        id: `l${c.num}-s${s}`,
        sentence: c.template,
        placeholderKey: 'placeholder',
        targetWord,
        scrambledLetters: Array.from(lettersSet).sort(() => Math.random() - 0.5),
        clue: `Practice word focused on building your ${c.cat} capabilities.`,
        vocabulary: {
          definition: `A meaningful emotion word to help you notice and name what you are really feeling.`,
          similarWords: [],
        },
      });
    }

    return {
      levelNumber: c.num,
      name: c.name,
      category: c.cat,
      stages
    };
  });
}

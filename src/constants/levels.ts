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
  vocabulary?: {
    definition: string;
    examples: string[];
    synonyms: string[];
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
          examples: ['A rejuvenating walk in the park.', 'A rejuvenating conversation that lifted my spirit.'],
          synonyms: ['Restorative', 'Refreshing', 'Revitalizing'],
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
          examples: ['I feel appreciative for the time they spent listening.', 'I am appreciative of the unexpected help.'],
          synonyms: ['Grateful', 'Thankful', 'Acknowledging'],
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
          examples: ['A nourishing conversation.', 'A nourishing weekend away.'],
          synonyms: ['Comforting', 'Healing', 'Restorative'],
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
        clue: 'Make someone lose their sense of direction or position.',
        vocabulary: {
          definition: 'Feeling confused about where you are, where you are going, or what is happening around you.',
          examples: ['I felt disoriented after waking up from the long, deep sleep.', 'The sudden change in plans left the team feeling disoriented.'],
          synonyms: ['Confused', 'Baffled', 'Perplexed'],
          similarWords: [
            { word: 'Confused', meaning: 'Unable to think clearly or understand something.' },
            { word: 'Baffled', meaning: 'Totally bewildered or perplexed by a situation.' },
            { word: 'Perplexed', meaning: 'Completely baffled; very puzzled.' }
          ]
        }
      },
      {
        id: 'l2-s2',
        sentence: 'Seeing my childhood home after so many decades made me feel highly {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'NOSTALGIC',
        scrambledLetters: ['N', 'O', 'S', 'T', 'A', 'L', 'G', 'I', 'C', 'P', 'Q'],
        clue: 'Exhibiting a sentimental longing or wistful affection for the past.',
        vocabulary: {
          definition: 'Feeling a sentimental, affectionate longing for a period in the past.',
          examples: ['Looking at the old photographs made me feel nostalgic.', 'A nostalgic song played on the radio, reminding me of childhood.'],
          synonyms: ['Wistful', 'Sentimental', 'Longing'],
          similarWords: [
            { word: 'Wistful', meaning: 'Having or showing a feeling of vague or regretful longing.' },
            { word: 'Sentimental', meaning: 'Prompted by feelings of tenderness, sadness, or nostalgia.' },
            { word: 'Longing', meaning: 'A strong feeling of wanting something, especially something distant.' }
          ]
        }
      },
      {
        id: 'l2-s3',
        sentence: 'I felt {placeholder} when they praised my work in front of the whole department.',
        placeholderKey: 'placeholder',
        targetWord: 'VALIDATED',
        scrambledLetters: ['V', 'A', 'L', 'I', 'D', 'A', 'T', 'E', 'D', 'S', 'T'],
        clue: 'Feeling recognized, worthy, or approved.',
        vocabulary: {
          definition: 'Feeling that your emotions, thoughts, or experiences are recognized, understood, and accepted as worthwhile.',
          examples: ['I felt validated when my manager agreed that the task was indeed difficult.', 'Having a friend listen without judgment made her feel validated.'],
          synonyms: ['Acknowledged', 'Affirmed', 'Recognized'],
          similarWords: [
            { word: 'Acknowledged', meaning: 'Accepted or admitted as true or valid.' },
            { word: 'Affirmed', meaning: 'Confirmed or supported strongly.' },
            { word: 'Recognized', meaning: 'Identified and appreciated for your value.' }
          ]
        }
      },
      {
        id: 'l2-s4',
        sentence: 'Waiting for the test results left me feeling incredibly {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'APPREHENSIVE',
        scrambledLetters: ['A', 'P', 'P', 'R', 'E', 'H', 'E', 'N', 'S', 'I', 'V', 'E', 'L', 'K'],
        clue: 'Anxious or fearful that something bad or unpleasant will happen.',
        vocabulary: {
          definition: 'Feeling anxious or fearful about the future or about a specific upcoming event.',
          examples: ['I felt apprehensive before presenting my ideas to the executives.', 'She was apprehensive about moving to a new city alone.'],
          synonyms: ['Anxious', 'Fearful', 'Uneasy'],
          similarWords: [
            { word: 'Anxious', meaning: 'Feeling worried, uneasy, or nervous about something with an uncertain outcome.' },
            { word: 'Fearful', meaning: 'Feeling afraid or dreading something.' },
            { word: 'Uneasy', meaning: 'Causing or feeling anxiety; troubled or uncomfortable.' }
          ]
        }
      },
      {
        id: 'l2-s5',
        sentence: 'Her warm apology left me feeling entirely {placeholder} and calm.',
        placeholderKey: 'placeholder',
        targetWord: 'REASSURED',
        scrambledLetters: ['R', 'E', 'A', 'S', 'S', 'U', 'R', 'E', 'D', 'A', 'B'],
        clue: 'Say or do something to remove the doubts or fears of someone.',
        vocabulary: {
          definition: 'Having your doubts, fears, or anxieties removed, leaving you feeling calm and secure.',
          examples: ['He felt reassured after talking to the doctor.', 'Her warm words left me completely reassured about our friendship.'],
          synonyms: ['Comforted', 'Encouraged', 'Secured'],
          similarWords: [
            { word: 'Comforted', meaning: 'Feeling less sad or worried; consoled.' },
            { word: 'Encouraged', meaning: 'Having more confidence or hope.' },
            { word: 'Secured', meaning: 'Feeling safe and free from danger or anxiety.' }
          ]
        }
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
        clue: 'Having or showing a confident and forceful personality.',
        vocabulary: {
          definition: 'Expressing your opinions, needs, and feelings clearly, directly, and confidently, without being aggressive.',
          examples: ['I need to be more assertive when requesting resources for my team.', 'An assertive response helped resolve the misunderstanding quickly.'],
          synonyms: ['Confident', 'Direct', 'Decisive'],
          similarWords: [
            { word: 'Confident', meaning: 'Feeling self-assurance arising from one\'s appreciation of one\'s own abilities.' },
            { word: 'Direct', meaning: 'Straightforward and honest in address or behavior.' },
            { word: 'Decisive', meaning: 'Having or showing the ability to make decisions quickly and effectively.' }
          ]
        }
      },
      {
        id: 'l3-s2',
        sentence: 'Handling the customer dispute required a highly {placeholder} approach.',
        placeholderKey: 'placeholder',
        targetWord: 'DIPLOMATIC',
        scrambledLetters: ['D', 'I', 'P', 'L', 'O', 'M', 'A', 'T', 'I', 'C', 'X', 'Y'],
        clue: 'Tactful and sensitive in dealing with people and difficult situations.',
        vocabulary: {
          definition: 'Handling relationships and sensitive situations tactfully, respectably, and effectively without causing offense.',
          examples: ['A diplomatic manager handles conflict with care.', 'We need to craft a diplomatic response to the client\'s criticism.'],
          synonyms: ['Tactful', 'Polite', 'Discreet'],
          similarWords: [
            { word: 'Tactful', meaning: 'Showing skill and sensitivity in dealing with people or difficult issues.' },
            { word: 'Polite', meaning: 'Having or showing behavior that is respectful and considerate.' },
            { word: 'Discreet', meaning: 'Careful and circumspect in one\'s speech or actions.' }
          ]
        }
      },
      {
        id: 'l3-s3',
        sentence: 'To work well in this remote team, we must build a highly {placeholder} environment.',
        placeholderKey: 'placeholder',
        targetWord: 'COLLABORATIVE',
        scrambledLetters: ['C', 'O', 'L', 'L', 'A', 'B', 'O', 'R', 'A', 'T', 'I', 'V', 'E', 'S', 'P'],
        clue: 'Produced or conducted by two or more parties working together.',
        vocabulary: {
          definition: 'Working jointly with others or multiple groups to achieve a shared goal or create something together.',
          examples: ['We established a collaborative environment for our design sprint.', 'The project was a collaborative effort across three departments.'],
          synonyms: ['Cooperative', 'Joint', 'Collective'],
          similarWords: [
            { word: 'Cooperative', meaning: 'Involving mutual assistance in working toward a common goal.' },
            { word: 'Joint', meaning: 'Shared, held, or made by two or more people together.' },
            { word: 'Collective', meaning: 'Done by people acting as a group.' }
          ]
        }
      },
      {
        id: 'l3-s4',
        sentence: 'I will remain {placeholder} during the performance negotiation.',
        placeholderKey: 'placeholder',
        targetWord: 'COMPOSED',
        scrambledLetters: ['C', 'O', 'M', 'P', 'O', 'S', 'E', 'D', 'A', 'L'],
        clue: 'Calm and in control of oneself.',
        vocabulary: {
          definition: 'Maintaining a calm, tranquil, and self-controlled state of mind, especially under pressure.',
          examples: ['She remained composed throughout the stressful press conference.', 'Take a deep breath to help yourself stay composed during the debate.'],
          synonyms: ['Serene', 'Calm', 'Poised'],
          similarWords: [
            { word: 'Serene', meaning: 'Calm, peaceful, and untroubled.' },
            { word: 'Calm', meaning: 'Not showing or feeling nervousness, anger, or other strong emotions.' },
            { word: 'Poised', meaning: 'Having a composed and self-assured manner.' }
          ]
        }
      },
      {
        id: 'l3-s5',
        sentence: 'A good manager provides feedback that is direct but always {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'CONSTRUCTIVE',
        scrambledLetters: ['C', 'O', 'N', 'S', 'T', 'R', 'U', 'C', 'T', 'I', 'V', 'E', 'M', 'O'],
        clue: 'Serving a useful purpose; tending to build up.',
        vocabulary: {
          definition: 'Offering useful, positive, and developmental feedback or advice that helps build up rather than tear down.',
          examples: ['He offered constructive criticism that improved my coding style.', 'Let\'s focus on having a constructive conversation about our future plans.'],
          synonyms: ['Productive', 'Beneficial', 'Helpful'],
          similarWords: [
            { word: 'Productive', meaning: 'Producing significant, positive, or useful results.' },
            { word: 'Beneficial', meaning: 'Favorable or advantageous; resulting in good.' },
            { word: 'Helpful', meaning: 'Giving or ready to give help; useful.' }
          ]
        }
      },
      {
        id: 'l3-s6',
        sentence: 'When explaining the server failure to clients, we must be fully {placeholder}.',
        placeholderKey: 'placeholder',
        targetWord: 'TRANSPARENT',
        scrambledLetters: ['T', 'R', 'A', 'N', 'S', 'P', 'A', 'R', 'E', 'N', 'T', 'K', 'L'],
        clue: 'Easy to perceive or detect; open and honest.',
        vocabulary: {
          definition: 'Being open, honest, and clear about intentions, actions, and processes so others can see them clearly.',
          examples: ['We must be fully transparent about the database outage.', 'A transparent communication style builds long-term trust.'],
          synonyms: ['Open', 'Candid', 'Clear'],
          similarWords: [
            { word: 'Open', meaning: 'Honest and frank; not secretive.' },
            { word: 'Candid', meaning: 'Truthful and straightforward; frank.' },
            { word: 'Clear', meaning: 'Easy to perceive, understand, or interpret.' }
          ]
        }
      },
      {
        id: 'l3-s7',
        sentence: 'I decided to take a {placeholder} stance on the controversial board decision.',
        placeholderKey: 'placeholder',
        targetWord: 'PRAGMATIC',
        scrambledLetters: ['P', 'R', 'A', 'G', 'M', 'A', 'T', 'I', 'C', 'R', 'S'],
        clue: 'Dealing with things sensibly and realistically in a way that is based on practical considerations.',
        vocabulary: {
          definition: 'Approaching problems and situations in a practical, sensible, and realistic way, rather than focusing on theoretical ideas.',
          examples: ['We need a pragmatic solution that we can build in three days.', 'Taking a pragmatic stance helped us finish the project on budget.'],
          synonyms: ['Practical', 'Realistic', 'Sensible'],
          similarWords: [
            { word: 'Practical', meaning: 'Concerned with the actual doing or use of something rather than with theory.' },
            { word: 'Realistic', meaning: 'Having or showing a sensible and practical idea of what can be achieved or expected.' },
            { word: 'Sensible', meaning: 'Chosen in accordance with wisdom or prudence; likely to be of benefit.' }
          ]
        }
      }
    ]
  },
  // Level 4 to 10 can be generated programmatically to prevent gigantic file sizes
  // but keeping a strict type-safe definition for each of the remaining levels.
  ...generateRemainingLevels()
];

function getWordVocabulary(word: string, category: string) {
  const details: Record<string, { definition: string; examples: string[]; synonyms: string[]; similarWords: Array<{ word: string; meaning: string }> }> = {
    'CENTERED': {
      definition: 'Feeling calm, stable, and focused in your mind and emotions.',
      examples: ['Taking three deep breaths helped her feel centered.', 'He remained centered despite the noise around him.'],
      synonyms: ['Grounded', 'Balanced', 'Stable'],
      similarWords: [
        { word: 'Grounded', meaning: 'Mentally stable and connected to the present moment.' },
        { word: 'Balanced', meaning: 'Having different elements of your life or emotions in correct proportions.' }
      ]
    },
    'GROUNDED': {
      definition: 'Feeling emotionally stable, connected to the present, and realistic.',
      examples: ['Walking barefoot on grass helps you feel grounded.', 'Her practical advice kept me grounded.'],
      synonyms: ['Centered', 'Sensible', 'Realistic'],
      similarWords: [
        { word: 'Centered', meaning: 'Calm, stable, and focused in mind and emotions.' },
        { word: 'Balanced', meaning: 'In a state of emotional equilibrium.' }
      ]
    },
    'MINDFUL': {
      definition: 'Consciously aware of the present moment, including your thoughts, feelings, and surroundings.',
      examples: ['Being mindful during meals helps you appreciate food.', 'A mindful walk through the garden.'],
      synonyms: ['Aware', 'Conscious', 'Attentive'],
      similarWords: [
        { word: 'Attentive', meaning: 'Paying close attention to something.' },
        { word: 'Observant', meaning: 'Quick to notice things; alert.' }
      ]
    },
    'SERENE': {
      definition: 'Calm, peaceful, and untroubled; free of emotional disturbance.',
      examples: ['The lake was serene in the early morning.', 'A serene smile crossed her face.'],
      synonyms: ['Tranquil', 'Peaceful', 'Placid'],
      similarWords: [
        { word: 'Tranquil', meaning: 'Free from disturbance; calm.' },
        { word: 'Placid', meaning: 'Not easily upset or excited.' }
      ]
    },
    'COMPASSIONATE': {
      definition: 'Feeling or showing deep sympathy and concern for others who are suffering, combined with a desire to help.',
      examples: ['She gave a compassionate response to the crying child.', 'A compassionate caregiver makes a huge difference.'],
      synonyms: ['Empathetic', 'Kind', 'Sympathetic'],
      similarWords: [
        { word: 'Empathetic', meaning: 'Able to understand and share the feelings of another.' },
        { word: 'Benevolent', meaning: 'Well-meaning and kindly.' }
      ]
    },
    'DETERMINED': {
      definition: 'Having made a firm decision and being resolved not to change it.',
      examples: ['She was determined to finish the marathon.', 'A determined effort led to success.'],
      synonyms: ['Resolute', 'Resolved', 'Steadfast'],
      similarWords: [
        { word: 'Resolute', meaning: 'Admirably purposeful, determined, and unwavering.' },
        { word: 'Persistent', meaning: 'Continuing firmly in a course of action in spite of difficulty.' }
      ]
    },
    'EMPATHETIC': {
      definition: 'Showing an ability to understand and share the feelings of another person.',
      examples: ['An empathetic listener provides deep comfort.', 'She was empathetic to his difficult situation.'],
      synonyms: ['Understanding', 'Compassionate', 'Sensitive'],
      similarWords: [
        { word: 'Compassionate', meaning: 'Showing concern for others who are suffering.' },
        { word: 'Attuned', meaning: 'Receptive and in harmony with others.' }
      ]
    },
    'RESILIENT': {
      definition: 'Able to withstand or recover quickly from difficult conditions or setbacks.',
      examples: ['Resilient communities rebuild quickly after disasters.', 'He was resilient in the face of career challenges.'],
      synonyms: ['Tough', 'Strong', 'Adaptable'],
      similarWords: [
        { word: 'Steadfast', meaning: 'Unwavering and dutiful.' },
        { word: 'Tenacious', meaning: 'Tending to keep a firm hold of something; clinging or adhering closely.' }
      ]
    },
    'AUTHENTIC': {
      definition: 'True to one\'s own personality, spirit, or character; sincere and genuine.',
      examples: ['She is always authentic, never pretending to be someone else.', 'He spoke in an authentic voice about his experiences.'],
      synonyms: ['Genuine', 'Real', 'Sincere'],
      similarWords: [
        { word: 'Sincere', meaning: 'Free from pretense or deceit; proceeding from genuine feelings.' },
        { word: 'Honest', meaning: 'Free of deceit and untruthfulness; sincere.' }
      ]
    }
  };

  const wordUpper = word.toUpperCase();
  if (details[wordUpper]) {
    return details[wordUpper];
  }

  // Fallback dynamic generator if word is not in the map
  const cleanWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return {
    definition: `Refers to a state of being ${cleanWord.toLowerCase()} which supports your growth in the context of ${category}.`,
    examples: [`Practicing being ${cleanWord.toLowerCase()} helps build emotional clarity.`, `She felt extremely ${cleanWord.toLowerCase()} during the reflection session.`],
    synonyms: [`Aligned`, `Present`, `Intentional`],
    similarWords: [
      { word: 'Aligned', meaning: 'In correct relative position or agreement.' },
      { word: 'Present', meaning: 'Fully aware and focused on the now.' }
    ]
  };
}

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
        vocabulary: getWordVocabulary(targetWord, c.cat)
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

/**
 * Server-side mirror of src/constants/levels.ts — minimal data needed to
 * independently verify a submitted Clarity Quest answer (levels/stages/words
 * only, none of the display copy). This MUST be kept in sync with the
 * frontend file's level 1-3 words and level 4-10 category word lists — if
 * one is edited without the other, stage validation will start rejecting
 * (or wrongly accepting) correct answers.
 *
 * This duplication exists because the agent and the Next.js app are
 * separate Node projects with no shared package; a real workspace/shared
 * package would remove the sync risk if this app grows further.
 */

const LEVEL_WORDS: Record<number, string[]> = {
  1: ['REJUVENATING', 'APPRECIATIVE', 'NOURISHING'],
  2: ['DISORIENTED', 'NOSTALGIC', 'VALIDATED', 'APPREHENSIVE', 'REASSURED'],
  3: ['ASSERTIVE', 'DIPLOMATIC', 'COLLABORATIVE', 'COMPOSED', 'CONSTRUCTIVE', 'TRANSPARENT', 'PRAGMATIC'],
};

// Levels 4-10 are generated the same way src/constants/levels.ts derives them:
// stageCount = num * 2 + 1, and the target word cycles through this list.
const GENERATED_LEVEL_WORDS: Record<number, string[]> = {
  4: ['CENTERED', 'GROUNDED', 'FOCUSSED', 'MINDFUL', 'SERENE', 'PLACID', 'ATTENTIVE', 'BALANCED', 'ANCHORED'],
  5: ['FORGIVING', 'ACCEPTING', 'PATIENT', 'GENTLE', 'TOLERANT', 'NURTURING', 'KINDHEARTED', 'LENIENT', 'COMPASSIONATE', 'BENEVOLENT', 'GRACIOUS'],
  6: ['EMPATHETIC', 'SUPPORTIVE', 'CONNECTED', 'ATTUNED', 'HARMONIOUS', 'RECEPTIVE', 'GENEROUS', 'CONSIDERATE', 'SINCERE', 'AMICABLE', 'TRUSTWORTHY', 'DEVOTED', 'COMPANIONABLE'],
  7: ['DETERMINED', 'DILIGENT', 'RESOLUTE', 'MOTIVATED', 'PROACTIVE', 'PERSISTENT', 'AMBITIOUS', 'DISCIPLINED', 'EFFICIENT', 'RESOURCEFUL', 'INDUSTRIOUS', 'TENACIOUS', 'STEADFAST', 'UNWAVERING', 'ORGANIZED'],
  8: ['VIVID', 'LUMINOUS', 'INTRICATE', 'IMAGINATIVE', 'EVOCATIVE', 'EXPRESSIVE', 'POETIC', 'DRAMATIC', 'CAPTIVATING', 'ELEGANT', 'MAJESTIC', 'SPLENDID', 'SUBLIME', 'PROFOUND', 'ILLUSTRIOUS', 'SPELLBINDING', 'ENCHANTING'],
  9: ['DIPLOMATIC', 'EMPATHETIC', 'ASSERTIVE', 'RESILIENT', 'COURTEOUS', 'VALIANT', 'RELIABLE', 'EQUITABLE', 'GENEROUS', 'SINCERE', 'PRAGMATIC', 'CONSTRUCTIVE', 'TRANSPARENT', 'NOURISHING', 'REASSURED', 'COMPOSED', 'BALANCED', 'GROUNDED', 'VIGILANT'],
  10: ['TRANSCENDENT', 'INTELLIGENT', 'PHILOSOPHICAL', 'INTUITIVE', 'INSPIRATIONAL', 'METICULOUS', 'EXTRAORDINARY', 'REVOLUTIONARY', 'EXEMPLARY', 'UNPRECEDENTED', 'ACCOMPLISHED', 'PERSPECUOUS', 'SOPHISTICATED', 'MAGNANIMOUS', 'CONSCIENTIOUS', 'PERSEVERING', 'AUTHENTIC', 'EQUITABLE', 'BENEFICENT', 'KNOWLEDGEABLE', 'CLARIFIED'],
};

export const TOTAL_LEVELS = 10;

export function getStageCount(levelNumber: number): number {
  if (levelNumber >= 1 && levelNumber <= 3) {
    return LEVEL_WORDS[levelNumber]?.length ?? 0;
  }
  if (levelNumber >= 4 && levelNumber <= 10) {
    return levelNumber * 2 + 1;
  }
  return 0;
}

/** stageNumber is 1-indexed, matching quest_progress.current_stage. */
export function getTargetWord(levelNumber: number, stageNumber: number): string | null {
  if (levelNumber >= 1 && levelNumber <= 3) {
    const words = LEVEL_WORDS[levelNumber];
    return words?.[stageNumber - 1] ?? null;
  }
  if (levelNumber >= 4 && levelNumber <= 10) {
    const words = GENERATED_LEVEL_WORDS[levelNumber];
    if (!words || words.length === 0) return null;
    const stageCount = getStageCount(levelNumber);
    if (stageNumber < 1 || stageNumber > stageCount) return null;
    return words[(stageNumber - 1) % words.length];
  }
  return null;
}

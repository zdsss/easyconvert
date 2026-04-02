import { classifyDifficultyAdvanced } from './advancedDifficultyClassifier';
import { classifyDifficulty } from './difficultyClassifier';

export function classifyResume(text: string) {
  try {
    return classifyDifficultyAdvanced(text);
  } catch {
    return classifyDifficulty(text);
  }
}

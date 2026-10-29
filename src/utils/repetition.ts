import type { Vocabulary } from "../types/vocabulary";

export function calculateDifficulty(word: Vocabulary): number {
    const difficulty = (word.wrongCount +1)/(word.correctCount + word.wrongCount +2);
    return(difficulty)
}
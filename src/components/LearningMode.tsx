import type { VocabularyList } from "../types/vocabularyList";
import { useState, useEffect } from "react";
import { calculateDifficulty } from "../utils/repetition";
import type { Vocabulary } from "../types/vocabulary";
import "../App.css";

type LearningModeProps = {
    list: VocabularyList;
    onAnswer: (wordId: number, isCorrect: boolean) => void;
};


function LearningMode({ list, onAnswer }: LearningModeProps) {

    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [answer, setAnswer] = useState<string>("");
    const [isChecked, setIsChecked] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [shuffledWords, setShuffledWords] = useState(() => shuffleWords(list.vocabularies));
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [roundCorrect, setRoundCorrect] = useState<number>(0);
    const [roundWrong, setRoundWrong] = useState<number>(0);
    const [wrongWords, setWrongWords] = useState<Vocabulary[]>([]);
    const [seenWordIds, setSeenWordIds] = useState<number[]>([]);
    const [learningType, setLearningType] = useState<"all" | "difficult">("all");
    const [selectedCount, setSelectedCount] = useState<number>(list.vocabularies.length);
    const [questionDirection, setQuestionDirection] =
        useState<"original" | "translation">("original");

    useEffect(() => {
        if (
            shuffledWords.length === 0 &&
            list.vocabularies.length > 0
        ) {
            setShuffledWords(shuffleWords(list.vocabularies));
            setCurrentIndex(0);
        }
    }, [list.vocabularies, shuffledWords.length]);

    const difficultWords = list.vocabularies.filter(word =>
        calculateDifficulty(word) > 0.6
    );

    const totalAnswers = roundCorrect + roundWrong;

    const successRate = totalAnswers > 0
        ? Math.round(roundCorrect / (totalAnswers) * 100)
        : 0;

    const learningProgress = shuffledWords.length > 0
        ? Math.round((totalAnswers / shuffledWords.length) * 100)
        : 0;

    function nextWord() {
        if (currentIndex < shuffledWords.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }

        setAnswer("");
        setIsChecked(false);
        setFeedback(null);
    }

    function checkAnswer() {
        if (isChecked) return;

        const correctAnswer = questionDirection === "original"
            ? currentWord.translation
            : currentWord.original;

        const isCorrect = answer.trim().length > 0 &&
            answer.trim().toLowerCase() ===
            correctAnswer.trim().toLowerCase();

        onAnswer(currentWord.id, isCorrect);
        setIsChecked(true);
        setSeenWordIds(prev =>
            prev.includes(currentWord.id) ? prev : [...prev, currentWord.id]
        );

        if (isCorrect) {
            setFeedback("richtig");
            setRoundCorrect(prev => prev + 1);
        } else {
            setFeedback(`falsch; richtige Antwort: ${correctAnswer}`);
            setRoundWrong(prev => prev + 1);
            setWrongWords(prev => [...prev, currentWord]);
        }
        if (currentIndex === shuffledWords.length - 1) {
            setIsFinished(true);
        }
    }

    function shuffleWords(words: Vocabulary[]): Vocabulary[] {
        const shuffled = [...words];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] =
                [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    function resetLearning() {
        setAnswer("");
        setIsChecked(false);
        setFeedback(null);
        setCurrentIndex(0);
        setRoundCorrect(0);
        setRoundWrong(0);
        setWrongWords([]);
        setIsFinished(false);
    }

    function selectWords(words: Vocabulary[], count = selectedCount): Vocabulary[] {
        return shuffleWords(words).slice(0, Math.min(count, words.length));
    }

    function startRound(
        words: Vocabulary[],
        resetSeenWords = false,
        count = selectedCount
    ) {
        const alreadySeen = resetSeenWords ? [] : seenWordIds;
        let unseenWords = words.filter(word => !alreadySeen.includes(word.id));

        if (unseenWords.length === 0) {
            setSeenWordIds([]);
            unseenWords = words;
        } else if (resetSeenWords) {
            setSeenWordIds([]);
        }

        setShuffledWords(selectWords(unseenWords, count));
        resetLearning();
    }

    function repeatLearning() {
        setShuffledWords(shuffleWords(shuffledWords));
        resetLearning();
    }

    function repeatWrongWords() {
        setShuffledWords(shuffleWords(wrongWords));
        resetLearning();
    }

    function startNewLearningRound() {
        const words = learningType === "difficult"
            ? difficultWords
            : list.vocabularies;
        startRound(words);
    }

    function startAllLearning() {
        const resetSeenWords = learningType !== "all";
        setLearningType("all");
        startRound(list.vocabularies, resetSeenWords);
    }

    function startDifficultLearning() {
        if (difficultWords.length === 0) return;
        const resetSeenWords = learningType !== "difficult";
        setLearningType("difficult");
        startRound(difficultWords, resetSeenWords);
    }

    function changeDirection(direction: "original" | "translation") {
        setQuestionDirection(direction);
        const words = learningType === "difficult"
            ? difficultWords
            : list.vocabularies;
        startRound(words, true);
    }

    if (list.vocabularies.length === 0) {
        return <p>Diese Liste enthält noch keine Vokabeln.</p>;
    }

    const currentWord =
        shuffledWords[currentIndex % shuffledWords.length];

    if (!currentWord) {
        return (
            <div>
                <p>Für diese Lernrunde sind noch keine Vokabeln geladen.</p>

                <button onClick={startAllLearning}>
                    Lernrunde starten
                </button>
            </div>
        )
    }

    if (isFinished) {
        return (
            <div>
                <h2>Lernrunde abgeschlossen! 🎉</h2>

                <p>{feedback}</p>

                <p>Du hast alle Vokabeln durchgearbeitet.</p>

                <p>Richtig: {roundCorrect}</p>
                <p>Falsch: {roundWrong}</p>
                <p>Erfolgsquote: {successRate}%</p>
                <div className="progressBar">
                    <div
                        className="progressFill"
                        style={{ width: `${successRate}%` }}
                    />
                </div>

                <button onClick={repeatLearning}>
                    Vokabeln wiederholen
                </button>
                <button onClick={repeatWrongWords} disabled={wrongWords.length === 0}>
                    Falsch beantwortete Vokabeln wiederholen
                </button>
                <button onClick={startNewLearningRound}>
                    Weiter
                </button>
            </div>
        );
    }

    return (
        <div>
            <h2>Lernmodus: {list.name}</h2>
            <p>
                Schwierige Vokabeln: {difficultWords.length}
            </p>
            <button
                onClick={startDifficultLearning}
                disabled={difficultWords.length === 0}
            >
                Schwierige Vokabeln üben
            </button> <button onClick={startAllLearning}>
                Ausgewählte Vokabeln lernen
            </button>
            <label>
                Vokabeln pro Lernrunde (1–{list.vocabularies.length}):
                <input
                    type="number"
                    min={1}
                    max={list.vocabularies.length}
                    step={1}
                    value={selectedCount}
                    onChange={(event) => {
                        const count = event.currentTarget.valueAsNumber;
                        if (
                            Number.isInteger(count) &&
                            count >= 1 &&
                            count <= list.vocabularies.length &&
                            count !== selectedCount
                        ) {
                            setSelectedCount(count);
                            setSeenWordIds([]);
                        }
                    }}
                />
            </label>
            <button onClick={() => changeDirection("original")}
                            disabled={questionDirection === "original"}>
                Original → Übersetzung
            </button>

            <button onClick={() => changeDirection("translation")}
                            disabled={questionDirection === "translation"}>
                Übersetzung → Original
            </button>
            <div className="progressBar">
                <div
                    className="progressFill"
                    style={{ width: `${learningProgress}%` }}
                />
            </div>

            <p>Übersetze</p>
            <h3>
                {questionDirection === "original"
                    ? currentWord.original
                    : currentWord.translation
                }
            </h3>
            <input
                type="text"
                placeholder="Übersetzung"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        if (isChecked) {
                            nextWord();
                        } else {
                            checkAnswer();
                        }
                    }
                }}>
            </input>
            <button onClick={checkAnswer} disabled={isChecked}>
                Antwort überprüfen
            </button>
            <button onClick={nextWord} disabled={!isChecked}>nächstes Wort</button>
            {feedback && (
                <p>{feedback}</p>
            )}
            <button onClick={startNewLearningRound}>
                Neue Liste starten
            </button>
        </div>

    );

}

export default LearningMode;
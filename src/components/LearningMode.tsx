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
    const [learningType, setLearningType] = useState<"all" | "difficult">("all");
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
        if (isChecked || !answer.trim()) return;

        const correctAnswer = questionDirection === "original"
            ? currentWord.translation
            : currentWord.original;

        const isCorrect =
            answer.trim().toLowerCase() ===
            correctAnswer.trim().toLowerCase();

        onAnswer(currentWord.id, isCorrect);
        setIsChecked(true);

        if (isCorrect) {
            setFeedback("richtig");
            setRoundCorrect(prev => prev + 1);
        } else {
            setFeedback(`falsch; richtige Antwort: ${correctAnswer}`);
            setRoundWrong(prev => prev + 1)
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
        setIsFinished(false);
    }

    function restartLearning() {
        const useDifficult =
            learningType === "difficult" &&
            difficultWords.length > 0;

        const words = useDifficult
            ? difficultWords
            : list.vocabularies;

        setLearningType(useDifficult ? "difficult" : "all");

        setShuffledWords(shuffleWords(words));
        resetLearning()
    }

    function startAllLearning() {
        setLearningType("all");
        setShuffledWords(shuffleWords(list.vocabularies));
        resetLearning()
    }

    function startDifficultLearning() {
        if (difficultWords.length === 0) return;
        setLearningType("difficult");
        setShuffledWords(shuffleWords(difficultWords))
        resetLearning()
    }

    function changeDirection(direction: "original" | "translation") {
    const words = learningType === "difficult"
        ? difficultWords
        : list.vocabularies;

    setQuestionDirection(direction);
    setShuffledWords(shuffleWords(words));
    resetLearning()
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

                <button onClick={restartLearning}>
                    Neue Lernrunde starten
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
                Alle Vokabeln lernen
            </button>
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
                onChange={(e) => setAnswer(e.target.value)}>
            </input>
            <button onClick={checkAnswer} disabled={isChecked}>
                Antwort überprüfen
            </button>
            <button onClick={nextWord} disabled={!isChecked}>nächstes Wort</button>
            {feedback && (
                <p>{feedback}</p>
            )}
            <button onClick={restartLearning}>
                Neu mischen
            </button>
        </div>

    );

}

export default LearningMode;
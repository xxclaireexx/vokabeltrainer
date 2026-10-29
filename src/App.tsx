
import { useState, useEffect } from "react";
import type { Vocabulary } from "./types/vocabulary";
import type { VocabularyList } from "./types/vocabularyList";
import "./App.css";
import LearningMode from "./components/LearningMode";
import ExcelImport from "./components/ExcelImport";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

function App() {


  // Anmeldung / Regestrierung
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setAuthLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error.message);
    }
  }

  // Vokabellisten laden
  // Supabase ist ab jetzt die Datenquelle. Vorhandenes localStorage bleibt als Backup erhalten.
  const [lists, setLists] = useState<VocabularyList[]>([]);

  // Ausgewählte Liste
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  const selectedList = lists.find(
    list => list.id === selectedListId
  );

  // Sichtbarkeit Vokabeln
  const [view, setView] = useState<"manage" | "learn">("manage");

  // Eingabefelder
  const [original, setOriginal] = useState("");
  const [translation, setTranslation] = useState("");
  const [name, setName] = useState("");

  // Neue Vokabelliste erstellen
  async function addList() {
    if (!name.trim()) return;

    const { data, error } = await supabase
      .from("vocabulary_lists")
      .insert({
        name: name.trim()
      })
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    if (!data) return;

    const newList: VocabularyList = {
      id: data.id,
      name: data.name,
      vocabularies: []
    };

    setLists(prev => [...prev, newList]);
    setName("");
  }

  // Vokabellisten aus Datenbank laden

  
  useEffect(() => {
    // Beim Benutzerwechsel/Abmelden alte Daten sofort aus der Oberfläche entfernen.
    setLists([]);
    setSelectedListId(null);
    setView("manage");
    if (!session) return;

    // Die Abfrage ist an die angemeldete Person gebunden (RLS prüft den Zugriff).
    // Bei einem schnellen Kontowechsel könnte noch eine alte Anfrage laufen;
    // deshalb überprüfen wir vor der Übernahme den aktuellen Benutzer.
    let active = true;
    const userId = session.user.id;

    async function fetchLists() {
      const { data, error } = await supabase
        .from("vocabulary_lists")
        .select(`
          id,
          name,
          vocabularies (
            id,
            original,
            translation,
            correct_count,
            wrong_count
          )
        `);

      if (!active) return;
      if (error) {
        console.error("Listen konnten nicht geladen werden:", error.message);
        alert("Vokabellisten konnten nicht geladen werden.");
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (!active || authData.user?.id !== userId) return;

      const loadedLists: VocabularyList[] = (data ?? []).map(list => ({
        id: list.id,
        name: list.name,
        vocabularies: list.vocabularies.map(word => ({
          id: word.id,
          original: word.original,
          translation: word.translation,
          correctCount: word.correct_count,
          wrongCount: word.wrong_count
        }))
      }));
      setLists(loadedLists);
    }

    void fetchLists();
    return () => { active = false; };
  }, [session?.user.id]);

  // Vokabel zur ausgewählten Liste hinzufügen
  
async function addVocabulary() {
    if (selectedListId === null) return;
    if (!original.trim() || !translation.trim()) return;

    const { data, error } = await supabase
        .from("vocabularies")
        .insert({
            list_id: selectedListId,
            original: original.trim(),
            translation: translation.trim(),
            correct_count: 0,
            wrong_count: 0
        })
        .select()
        .single();

    if (error) {
        console.error(error.message);
        return;
    }

    if (!data) return;

    const newVocabulary: Vocabulary = {
        id: data.id,
        original: data.original,
        translation: data.translation,
        correctCount: data.correct_count,
        wrongCount: data.wrong_count
    };

    setLists(prev =>
        prev.map(list =>
            list.id === selectedListId
                ? {
                    ...list,
                    vocabularies: [
                        ...list.vocabularies,
                        newVocabulary
                    ]
                }
                : list
        )
    );

    setOriginal("");
    setTranslation("");
}


  // Vokabel erst in Supabase löschen, dann aus dem State entfernen.
  async function deleteVocabulary(id: number) {
    const listId = selectedListId;
    if (listId === null) return;

    const { error } = await supabase
      .from("vocabularies")
      .delete()
      .eq("id", id)
      .eq("list_id", listId);

    if (error) {
      console.error("Vokabel konnte nicht gelöscht werden:", error.message);
      alert("Vokabel konnte nicht gelöscht werden.");
      return;
    }

    setLists(prev => prev.map(list =>
      list.id === listId
        ? { ...list, vocabularies: list.vocabularies.filter(word => word.id !== id) }
        : list
    ));
  }

  // Eine Liste samt Vokabeln löschen (Foreign Key ON DELETE CASCADE).
  async function deleteVocabularyList(id: number) {
    const confirmed = window.confirm(
      "Möchtest du diese Liste und alle ihre Vokabeln wirklich löschen?"
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("vocabulary_lists")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Liste konnte nicht gelöscht werden:", error.message);
      alert("Liste konnte nicht gelöscht werden.");
      return;
    }

    setLists(prev => prev.filter(list => list.id !== id));
    if (selectedListId === id) setSelectedListId(null);
  }

  const [newName, setNewName] = useState<string>("");

  // Listenname zuerst in Supabase aktualisieren.
  async function renameVocabularyList(id: number, newName: string) {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const { data, error } = await supabase
      .from("vocabulary_lists")
      .update({ name: cleanName })
      .eq("id", id)
      .select("id, name")
      .single();

    if (error || !data) {
      console.error("Liste konnte nicht umbenannt werden:", error?.message);
      alert("Liste konnte nicht umbenannt werden.");
      return;
    }

    setLists(prev => prev.map(list =>
      list.id === id ? { ...list, name: data.name } : list
    ));
    setNewName("");
  }

  // Antwortzähler in Supabase aktualisieren, dann die Anzeige angleichen.
  async function handleAnswer(wordId: number, isCorrect: boolean) {
    const listId = selectedListId;
    if (listId === null) return;

    const word = lists
      .find(list => list.id === listId)
      ?.vocabularies.find(vocabulary => vocabulary.id === wordId);
    if (!word) return;

    const correctCount = word.correctCount + (isCorrect ? 1 : 0);
    const wrongCount = word.wrongCount + (isCorrect ? 0 : 1);

    const { data, error } = await supabase
      .from("vocabularies")
      .update({ correct_count: correctCount, wrong_count: wrongCount })
      .eq("id", wordId)
      .eq("list_id", listId)
      .select("correct_count, wrong_count")
      .single();

    if (error || !data) {
      console.error("Antwort konnte nicht gespeichert werden:", error?.message);
      alert("Antwortstatistik konnte nicht gespeichert werden.");
      return;
    }

    setLists(prev => prev.map(list =>
      list.id === listId
        ? {
            ...list,
            vocabularies: list.vocabularies.map(item =>
              item.id === wordId
                ? { ...item, correctCount: data.correct_count, wrongCount: data.wrong_count }
                : item
            )
          }
        : list
    ));
  }

  // Import Excel Tabellen
  
async function importVocabularies(vocabularies: Vocabulary[]) {
    if (selectedListId === null) return;
    if (vocabularies.length === 0) return;

    const listId = selectedListId;

    // Vokabeln ins Supabase-Format umwandeln
    const rows = vocabularies.map(word => ({
        list_id: listId,
        original: word.original,
        translation: word.translation,
        correct_count: 0,
        wrong_count: 0
    }));

    // Alle Vokabeln in Supabase speichern
    const { data, error } = await supabase
        .from("vocabularies")
        .insert(rows)
        .select();

    if (error) {
        console.error("Excel-Import fehlgeschlagen:", error.message);
        alert("Die Vokabeln konnten nicht importiert werden.");
        return;
    }

    if (!data) return;

    // Supabase-Daten in Vocabulary-Objekte umwandeln
    const importedWords: Vocabulary[] = data.map(word => ({
        id: word.id,
        original: word.original,
        translation: word.translation,
        correctCount: word.correct_count,
        wrongCount: word.wrong_count
    }));

    // React-State aktualisieren
    setLists(prev =>
        prev.map(list =>
            list.id === listId
                ? {
                    ...list,
                    vocabularies: [
                        ...list.vocabularies,
                        ...importedWords
                    ]
                }
                : list
        )
    );

    alert(`${importedWords.length} Vokabeln erfolgreich importiert!`);
}


  // Anmeldung / Regestrierung Anzeige

  if (authLoading) {
    return <p>Anmeldung wird überprüft …</p>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app">
      <h1>Vokabeltrainer 🎉🎉🎉</h1>

      <button onClick={handleLogout}>
        Abmelden
      </button>

      <button onClick={() => setView("manage")} disabled={view === "manage"}>
        Vokabeln verwalten
      </button>

      <button
        onClick={() => setView("learn")}
        disabled={!selectedList || view === "learn"}
      >
        Lernen
      </button>

      {view === "manage" && (
        <div>

          <h2>Neue Vokabelliste erstellen</h2>

          <input
            type="text"
            placeholder="Listenname"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button onClick={addList}>
            Liste erstellen
          </button>

          <h2>Meine Vokabellisten</h2>

          {lists.map(list => (
            <div key={list.id}>
              <h3>{list.name}</h3>
              <p>{list.vocabularies.length} Vokabeln</p>

              <button onClick={() => setSelectedListId(list.id)}>
                Liste auswählen
              </button>

              <button onClick={() => deleteVocabularyList(list.id)}>
                Liste löschen
              </button>
            </div>
          ))}

          {selectedList && (
            <div>
              <h2>Ausgewählte Liste: {selectedList.name}</h2>
              <input
                type="text"
                placeholder="Neuer Listenname"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}>
              </input>
              <button onClick={() => void renameVocabularyList(selectedList.id, newName)}>
                Liste umbenennen
              </button>
              <h3>Neue Vokabel hinzufügen</h3>
              {selectedList && (
                <ExcelImport onImport={importVocabularies} />
              )}

              <input
                type="text"
                placeholder="Original"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
              />

              <input
                type="text"
                placeholder="Übersetzung"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
              />

              <button onClick={addVocabulary}>
                Vokabel hinzufügen
              </button>

              <h3>Vokabeln in dieser Liste</h3>

              {selectedList.vocabularies.map(word => (
                <div key={word.id}>
                  <p>{word.original} - {word.translation}</p>
                  <p>
                    Richtig: {word.correctCount} |
                    Falsch: {word.wrongCount}
                  </p>

                  <button onClick={() => deleteVocabulary(word.id)}>
                    Vokabel löschen
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {view === "learn" && selectedList && (
        <LearningMode
          key={selectedList.id}
          list={selectedList}
          onAnswer={handleAnswer}
        />
      )}

    </div>
  );
}

export default App;
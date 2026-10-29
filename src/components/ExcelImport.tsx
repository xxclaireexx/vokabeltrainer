import { read, utils } from "xlsx";
import type { Vocabulary } from "../types/vocabulary";

type ExcelImportProps = {
    onImport: (vocabularies: Vocabulary[]) => void;
};

function ExcelImport({ onImport }: ExcelImportProps) {

    async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        const data = await file.arrayBuffer();

        const workbook = read(data);

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = utils.sheet_to_json<string[]>(worksheet, {
            header: 1
        });

        const vocabularies: Vocabulary[] = rows
            .slice(1)
            .filter(row =>
                row.length >= 2 &&
                String(row[0] ?? "").trim() !== "" &&
                String(row[1] ?? "").trim() !== ""
            )
            .map((row, index) => ({
                id: Date.now() + index,
                original: String(row[0]).trim(),
                translation: String(row[1]).trim(),
                correctCount: 0,
                wrongCount: 0
            }));

        onImport(vocabularies);
    }

    return (
        <div>
            <h3>Vokabeln aus Excel importieren</h3>

            <input
                type="file"
                accept=".xlsx"
                onChange={handleFile}
            />
        </div>
    );
}

export default ExcelImport;
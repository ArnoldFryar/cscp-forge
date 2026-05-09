import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildGeneratedQuestionsModule, buildQuestionsJson, importQuestionsFromCsv } from "../lib/importQuestions";

// Place your original CSCP-style CSV at cscp-study-app/import-data/questions.csv
// or run this script with a custom input path:
// npm run import:questions -- --input "C:/path/to/CSCP_Original_Question_Bank_800.csv"
// The default output is data/generatedQuestions.ts, but you can also target public/questions.json with --output.

async function main() {
  const workingDirectory = process.cwd();
  const inputPath = resolvePath(getFlagValue("--input") ?? "import-data/questions.csv", workingDirectory);
  const outputPath = resolvePath(getFlagValue("--output") ?? "data/generatedQuestions.ts", workingDirectory);
  const csvText = await readFile(inputPath, "utf8");
  const result = importQuestionsFromCsv(csvText);

  if (result.errors.length > 0) {
    const formattedErrors = result.errors
      .map((error) => `Row ${error.rowNumber} [${error.code}] ${error.message}`)
      .join("\n");

    throw new Error(`Question import failed with ${result.errors.length} validation error(s):\n${formattedErrors}`);
  }

  const outputText = outputPath.toLowerCase().endsWith(".json")
    ? buildQuestionsJson(result.questions)
    : buildGeneratedQuestionsModule(result.questions, path.relative(workingDirectory, inputPath).replace(/\\/g, "/"));

  await writeFile(outputPath, outputText, "utf8");
  process.stdout.write(`Imported ${result.questions.length} question(s) from ${inputPath} into ${outputPath}.\n`);
}

function getFlagValue(flagName: string) {
  const flagIndex = process.argv.indexOf(flagName);
  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
}

function resolvePath(targetPath: string, workingDirectory: string) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(workingDirectory, targetPath);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
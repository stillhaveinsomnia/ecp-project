import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { po } from "gettext-parser";
import { promisify } from "util";
import { languagesDict } from "./components/i18n/languages";
import linguiConfig from "./lingui.config";

const execAsync = promisify(exec);

// TODO upgrade to translategemma:12b when you have a better GPU
// retranslate all files with it, it does a good job
const model = "translategemma:4b";

async function getLastCommitFileContent(filePath: string) {
  try {
    const { stdout } = await execAsync(`git show HEAD:${filePath}`);
    return stdout;
  } catch {
    return "";
  }
}

const localeToLanguageName = languagesDict as Record<string, string>;

async function translate(text: string, targetLocale: string) {
  const sourceLocale = linguiConfig.sourceLocale!;
  const sourceLanguage = localeToLanguageName[sourceLocale];
  const targetLanguage = localeToLanguageName[targetLocale];
  console.log(
    `Translating from ${sourceLanguage} (${sourceLocale}) to ${targetLanguage} (${targetLocale})...`,
  );
  const prompt =
    `You are a professional ${sourceLanguage} (${sourceLocale}) to ${targetLanguage} (${targetLocale}) translator. ` +
    `Your goal is to accurately convey the meaning and nuances of the original ${sourceLanguage} text ` +
    `while adhering to ${targetLanguage} grammar, vocabulary, and cultural sensitivities.\n` +
    `Produce only the ${targetLanguage} translation, without any additional explanations or commentary. ` +
    `Do not add, remove, or change any punctuation that is not present in the original text. ` +
    `Note: This is a UI label from a peer-to-peer chat application written in ICU message format. ` +
    `Preserve all ICU placeholders and syntax exactly as-is only translate the human-readable text portions.\n` +
    `Please translate the following ${sourceLanguage} text into ${targetLanguage}.\n` +
    `\n\n` +
    text;

  const estimatedTokens = Math.ceil(prompt.length / 4);
  const numCtx = Math.ceil((estimatedTokens * 2) / 256) * 256;

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: { num_ctx: numCtx },
    }),
  });
  const data = await response.json();
  const translation = data.message.content.trim();
  const fixedTranslation = text.endsWith(".")
    ? translation
    : translation.replace(/\.$/, "");
  console.log(`Translated "${text}" to "${fixedTranslation}" (ctx: ${numCtx})`);
  return fixedTranslation;
}

async function translateFile(filePath: string, targetLocale: string) {
  console.log(`Translating file ${filePath}`);
  const content = await readFile(filePath);
  const parsed = po.parse(content);
  const entries = parsed.translations[""]!;

  const lastCommitContent = await getLastCommitFileContent(filePath);
  const lastCommitParsed = lastCommitContent
    ? po.parse(lastCommitContent)
    : undefined;
  const lastCommitEntries = lastCommitParsed?.translations[""];

  for (const key in entries) {
    const entry = entries[key]!;
    if (!entry.msgid) continue;
    const currentTranslation = entry.msgstr?.[0];
    if (currentTranslation) continue;
    const lastCommitTranslation = lastCommitEntries?.[key]?.msgstr?.[0];
    if (lastCommitTranslation) continue;
    const translation = await translate(entry.msgid, targetLocale);
    entry.msgstr = [translation];
  }
  const compiled = po.compile(parsed, { foldLength: 0 });
  await writeFile(filePath, compiled);
}

async function translateCatalogs() {
  const locales = linguiConfig.locales;
  for (const locale of locales) {
    if (locale === linguiConfig.sourceLocale) continue;
    for (const catalog of linguiConfig.catalogs ?? []) {
      const filePath = `${catalog.path.replace("{locale}", locale)}.po`;
      await translateFile(filePath, locale);
    }
  }
}

async function main() {
  await execAsync(`ollama pull ${model}`);
  console.log("lingui extract");
  await execAsync("./node_modules/.bin/lingui extract");
  await translateCatalogs();
  console.log("lingui compile");
  await execAsync("./node_modules/.bin/lingui compile");
}

void main();

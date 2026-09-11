import fs from "fs";
import path from "path";
import { glob } from "node:fs/promises";

const files = [
  "app/[locale]/(main)/donors/opengraph-image.tsx",
  "app/[locale]/(main)/requests/opengraph-image.tsx",
  "app/[locale]/(main)/request/opengraph-image.tsx",
  "app/[locale]/become-donor/opengraph-image.tsx",
  "app/[locale]/blood-bank/opengraph-image.tsx",
  "app/[locale]/map/opengraph-image.tsx",
  "app/[locale]/(main)/leaderboard/opengraph-image.tsx",
  "app/[locale]/(main)/transparency/opengraph-image.tsx",
  "app/[locale]/(main)/teams/opengraph-image.tsx",
  "app/[locale]/(main)/feed/opengraph-image.tsx",
  "app/[locale]/(main)/guidance/opengraph-image.tsx",
  "app/[locale]/(main)/about/opengraph-image.tsx",
  "app/[locale]/(main)/contact/opengraph-image.tsx",
  "app/[locale]/(main)/privacy/opengraph-image.tsx",
  "app/[locale]/(main)/terms/opengraph-image.tsx",
];

let changed = 0;
for (const rel of files) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) {
    console.log("SKIP (not found):", rel);
    continue;
  }
  let src = fs.readFileSync(full, "utf8");

  const match = src.match(/pageOgCardProps\("(\w+)"\)/);
  if (!match) {
    console.log("SKIP (no pageOgCardProps match):", rel);
    continue;
  }
  const key = match[1];

  const oldFnRe = new RegExp(
    `export default async function Image\\(\\)\\s*\\{\\s*return renderOgImage\\(pageOgCardProps\\("${key}"\\)\\);\\s*\\}`,
  );
  const newFn = `export default async function Image({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {\n  const { locale } = await params;\n  return renderOgImage(pageOgCardProps("${key}", locale));\n}`;

  if (!oldFnRe.test(src)) {
    console.log("SKIP (pattern mismatch):", rel);
    continue;
  }

  src = src.replace(oldFnRe, newFn);
  fs.writeFileSync(full, src, "utf8");
  changed++;
  console.log("OK:", rel);
}
console.log(`\nDone: ${changed}/${files.length} files updated`);
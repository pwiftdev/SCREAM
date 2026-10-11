import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
export async function writeReport(path: string, content: string) {
  writeFileSync(
    path,
    await format(content, { ...(await resolveConfig(path)), filepath: path }),
  );
}

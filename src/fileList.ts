export function parseFileList(contents: string) {
  const files = contents
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'));

  return files;
}

import { ParseResult } from '../parse';

const translatedKeys = ['Name', 'Description', 'Comment'];

function parseDesktop(fileName: string, fileSource: string): ParseResult[] {
  const output = fileSource
    .split('\n')
    .map((keyValue, i) => ({ keyValue, line: i + 2 }))
    .filter(({ keyValue }) => keyValue.includes('='))
    .map(({ keyValue, line }) => {
      const [key, value] = keyValue.split('=');

      return {
        line,
        key: key.trim(),
        string: value.trim(),
      };
    })
    .filter(
      ({ string: value, key }) => translatedKeys.includes(key) && value != null
    );

  return output.map((entry) => {
    return {
      strings: [entry.string],
      line: entry.line,
      fileName,
    };
  });
}

export { parseDesktop };

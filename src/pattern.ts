export type Pattern = {
  strings: number[];
  context?: number;
};

type Patterns = Record<string, Pattern>;

export function definePatterns<T extends Patterns>(patterns: T): T {
  return patterns;
}

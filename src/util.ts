import Parser, { QueryCapture, Tree } from 'tree-sitter';

function parseSource(language: unknown, source: string): Parser.Tree {
  const parser = new Parser();
  parser.setLanguage(language);

  return parser.parse(source);
}

/**
 * @param language
 * @param  tree
 * @param  queries
 */
function queryTree(
  language: unknown,
  tree: Tree,
  ...queries: string[]
): QueryCapture[] {
  const query = new Parser.Query(language, queries.join('\n'));
  const captures = query.captures(tree.rootNode);

  return captures;
}

export { parseSource, queryTree };

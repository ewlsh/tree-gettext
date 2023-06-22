import { QueryCapture, SyntaxNode, Tree } from 'tree-sitter';
import { parseSource, queryTree } from './util';

type Language = 'xml' | 'javascript' | 'c';

export type ParseResult = {
  language?: Language;
  context?: string;
  isFormat?: boolean;
  fileName?: string;
  strings: string[];
  line?: number;
  comments?: string[];
};

export interface ParserOptions {
  formatComments?: boolean;
}

export enum SyntaxNodeType {
  CallExpression = 'call_expression',
  BinaryExpression = 'binary_expression',
  String = 'string',
  JavaScriptTemplateString = 'template_string',
  JavaScriptTemplateSubstitution = 'template_substitution',
  Identifier = 'identifier',
  MemberExpression = 'member_expression',
  Arguments = 'arguments',
  Comment = 'comment',
  CStringLiteral = 'string_literal',
  CConcatenatedString = 'concatenated_string',
}

function filterNullish<T>(arr: readonly (T | null | undefined)[]): T[] {
  return arr.filter((o): o is T => o != null);
}

export abstract class LanguageParser {
  fileSource: string;
  fileName: string;

  protected tree: Tree;
  protected language: any;

  constructor(language: any, fileSource: string, fileName: string) {
    this.fileSource = fileSource;
    this.fileName = fileName;

    this.language = language;
    this.tree = parseSource(language, this.fileSource);
  }

  protected buildExpressionQueryPatterns(): string[] {
    return [];
  }

  protected captureExpressions(
    queryPatterns: readonly string[]
  ): QueryCapture[] {
    return queryTree(this.language, this.tree, ...queryPatterns);
  }

  protected parseCallExpression(
    _capture: SyntaxNode,
    _options: ParserOptions
  ): ParseResult | null | undefined {
    return null;
  }

  protected parseExpression(
    _capture: SyntaxNode,
    _options: ParserOptions
  ): ParseResult | null | undefined {
    return null;
  }

  parseStrings(options: ParserOptions = {}): ParseResult[] {
    const capturedExpressions = this.captureExpressions(
      this.buildExpressionQueryPatterns()
    );

    const parseResults = capturedExpressions.map((capturedExpression) => {
      const expression =
        capturedExpression.node.parent ?? capturedExpression.node;

      if (expression.type === SyntaxNodeType.CallExpression) {
        return this.parseCallExpression(expression, options);
      }
      return this.parseExpression(expression, options);
    });

    return filterNullish(parseResults);
  }
}

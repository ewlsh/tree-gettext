import Parser, { SyntaxNode } from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

import { CStyleParser } from './c-style';
import { Pattern, definePatterns } from '../pattern';
import { ParseResult, ParserOptions, SyntaxNodeType } from '../parse';

const glibJSIdentifiers = definePatterns({
  C_: {
    context: 1,
    strings: [2],
  },
  N_: {
    strings: [1],
  },
  NC_: {
    context: 1,
    strings: [2],
  },
});

const jsIdentifiers = definePatterns({
  ...glibJSIdentifiers,
  gettext: {
    strings: [1],
  },
  _: {
    strings: [1],
  },
  dgettext: {
    strings: [2],
  },
  dcgettext: {
    strings: [2],
  },
  ngettext: {
    strings: [1, 2],
  },
  dngettext: {
    strings: [2, 3],
  },
  pgettext: {
    context: 1,
    strings: [2],
  },
  dpgettext: {
    context: 2,
    strings: [3],
  },
});

const javascriptFormatPlaceholders = ['%s', '%f', '%d'];

function unescapeUnicode(str: string) {
  return str.replace(/\\u([0-9]+)/g, (_, codepoint: string) => {
    return String.fromCodePoint(Number(`0x${codepoint}`));
  });
}

function concatString(node: SyntaxNode) {
  if (node.type == 'string') return unescapeUnicode(node.text.slice(1, -1));
  if (node.type !== 'binary_expression') return null;

  const left = node.namedChild(0);
  const right = node.namedChild(1);

  if (!left || !right) return null;

  const leftStr = concatString(left);
  const rightStr = concatString(right);

  if (leftStr == null || rightStr == null) return null;

  const start = '';

  return start + leftStr + rightStr;
}

class JavaScriptParser extends CStyleParser {
  constructor(fileSource, fileName) {
    super(JavaScript, fileSource, fileName);
  }

  private parseJavaScriptArgument(argument: Parser.SyntaxNode) {
    if (argument.type === SyntaxNodeType.String) {
      return unescapeUnicode(argument.text.slice(1, -1).replace(/\\u/, '\\u'));
    }

    if (argument.type === SyntaxNodeType.BinaryExpression) {
      return concatString(argument);
    }

    if (argument.type === SyntaxNodeType.JavaScriptTemplateString) {
      let i = 0;
      const result = argument.children.reduce((prev, next) => {
        if (next.type === '`') {
          return prev.replace('`', '');
        } else if (next.type === 'template_substitution') {
          return prev.replace(next.text, `\${${i++}}`);
        } else {
          return prev;
        }
      }, argument.text);

      return result;
    }

    return '';
  }

  /**
   * @param call
   * @param fileName
   * @returns
   */
  private parseJavaScriptCallExpression(
    call: Parser.SyntaxNode,
    fileName: string,
    disableFormat = false
  ): ParseResult | null {
    const [identifier, callExpressionArguments] = call.children;

    let pattern: Pattern | null = null;

    if (identifier.type === SyntaxNodeType.Identifier) {
      pattern = jsIdentifiers[identifier.text];
    } else if (identifier.type === SyntaxNodeType.MemberExpression) {
      const memberFunctionId = identifier.children[2];

      if (memberFunctionId) {
        pattern = jsIdentifiers[memberFunctionId.text];
      }
    }

    if (pattern && callExpressionArguments.type === SyntaxNodeType.Arguments) {
      const args = callExpressionArguments.namedChildren;

      const strings = [] as string[];
      let context = null as string | null;
      let firstArg = null as Parser.SyntaxNode | null;
      args.forEach((argument, i) => {
        if (!pattern) return;

        if (pattern.context === i + 1) {
          context = argument.text.slice(1, -1);
          return;
        }

        if (pattern.strings.includes(i + 1)) {
          if (!firstArg) firstArg = argument;

          const parsedStringArgument = this.parseJavaScriptArgument(argument);

          if (parsedStringArgument) {
            strings.push(parsedStringArgument);
          }
        }
      });
      if (firstArg && strings.length > 0) {
        return {
          fileName,
          line: firstArg.startPosition.row + 1,
          strings,
          context: context ?? undefined,
          language: 'javascript' as const,
          isFormat:
            !disableFormat &&
            javascriptFormatPlaceholders.some((f) =>
              strings.some((s) => s.includes(f))
            ),
        };
      }
    } else if (
      callExpressionArguments.type === SyntaxNodeType.JavaScriptTemplateString
    ) {
      let i = 0;
      const result = callExpressionArguments.children.reduce((prev, next) => {
        if (next.type === '`') {
          return prev.replace('`', '');
        } else if (
          next.type === SyntaxNodeType.JavaScriptTemplateSubstitution
        ) {
          return prev.replace(next.text, `\${${i++}}`);
        } else {
          return prev;
        }
      }, callExpressionArguments.text);

      return {
        line: callExpressionArguments.startPosition.row + 1,
        language: 'javascript' as const,
        strings: [result],
        isFormat:
          !disableFormat &&
          javascriptFormatPlaceholders.some((f) => result.includes(f)),
      };
    }

    return null;
  }

  protected buildExpressionQueryPatterns(): string[] {
    return [
      `(call_expression function: (identifier) @fn)`,
      `(call_expression function: (member_expression object: (identifier) property: (property_identifier)) @memberfn)`,
    ];
  }

  protected parseCallExpression(call: SyntaxNode, options: ParserOptions) {
    const { tree, fileName } = this;
    const { formatComments } = options;

    const comments = this.findCStyleComments(tree.rootNode, call, formatComments);
    const disableFormat = comments.some(
      (comment) =>
        comment.includes('xgettext:no-javascript-format') ||
        comment.includes('tree-gettext:no-javascript-format') ||
        comment.includes('xgettext:no-c-format') ||
        comment.includes('tree-gettext:no-c-format')
    );

    const entry = this.parseJavaScriptCallExpression(
      call,
      fileName,
      disableFormat
    );

    if (!entry) return null;

    return {
      ...entry,
      fileName,
      comments,
    };
  }
}

export { JavaScriptParser };

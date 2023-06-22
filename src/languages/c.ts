import Parser, { SyntaxNode } from 'tree-sitter';
import C from 'tree-sitter-c';
import { definePatterns } from '../pattern';
import { ParseResult, ParserOptions, SyntaxNodeType } from '../parse';
import { CStyleParser } from './c-style';

const glibCIdentifiers = definePatterns({
  g_dcgettext: {
    strings: [2],
  },
  g_dngettext: {
    strings: [2, 3],
  },
  g_dpgettext2: {
    context: 2,
    strings: [3],
  },
  C_: {
    context: 1,
    strings: [2],
  },
  N_: {
    strings: [1],
  },
});

const cIdentifiers = definePatterns({
  ...glibCIdentifiers,
  _: {
    strings: [1],
  },
  gettext: {
    strings: [1],
  },
  gettext_noop: {
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
  dcngettext: {
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
  dcpgettext: {
    context: 2,
    strings: [3],
  },
  npgettext: {
    context: 1,
    strings: [2, 3],
  },
  dnpgettext: {
    context: 2,
    strings: [3, 4],
  },
  dcnpgettext: {
    context: 2,
    strings: [3, 4],
  },
});

const cFormat = ['%s', '%i', '%d', '%f', '%u'];

function parseCArgument(argument: SyntaxNode): string | null {
  if (argument.type === SyntaxNodeType.CStringLiteral) {
    const string = argument.text.slice(1, -1);
    return string;
  } else if (argument.type === SyntaxNodeType.CConcatenatedString) {
    let string = '';
    argument.namedChildren.forEach((lit) => {
      if (lit.type === SyntaxNodeType.CStringLiteral) {
        string += lit.text.slice(1, -1);
      }
    });
    return string;
  }

  return null;
}

class CParser extends CStyleParser {
  constructor(fileSource: string, fileName: string) {
    super(C, fileSource, fileName);
  }

  protected buildExpressionQueryPatterns(): string[] {
    return [`(call_expression function: (identifier) @fn)`];
  }

  private parseCCallExpression(call: Parser.SyntaxNode) {
    const [identifier, str] = call.children;

    const pattern = cIdentifiers[identifier.text as keyof typeof cIdentifiers];
    if (pattern && str.type === 'argument_list') {
      const args = str.namedChildren;
      let context = null as string | null;
      const strings = args.reduce((strings, argument, i) => {
        if ('context' in pattern && pattern.context === i + 1) {
          context = argument.text.slice(1, -1);

          return strings;
        }

        if (!pattern.strings.includes(i + 1)) {
          return strings;
        }

        const parsedString = parseCArgument(argument);
        if (parsedString) {
          strings.push(parsedString);
        }

        return strings;
      }, [] as string[]);

      if (args.length > 0 && strings.length > 0) {
        return {
          line: args[0].startPosition.row + 1,
          strings,
          context: context || undefined,
          language: 'c' as const,
          isFormat: cFormat.some((f) => strings.some((s) => s.includes(f))),
        };
      }
    }

    return null;
  }

  protected parseCallExpression(
    expression: SyntaxNode,
    options: ParserOptions
  ): ParseResult {
    const { fileName, tree } = this;
    const { formatComments } = options;

    const comments = this.findCStyleComments(
      tree.rootNode,
      expression,
      formatComments
    );

    const entry = this.parseCCallExpression(expression);
    if (!entry) {
      return null;
    }

    return {
      ...entry,
      comments,
      fileName,
    };
  }
}

export { CParser };

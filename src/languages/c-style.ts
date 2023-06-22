import Parser from 'tree-sitter';
import { LanguageParser, SyntaxNodeType } from '../parse';
abstract class CStyleParser extends LanguageParser {
  /**
   *
   * @param rootNode
   * @param callExpressionNode
   * @returns
   */
  protected findCStyleComments(
    rootNode: Parser.SyntaxNode,
    callExpressionNode: Parser.SyntaxNode,
    formatComments = false
  ) {
    if (callExpressionNode.startPosition.row == 0) {
      return [];
    }

    let commentNode: Parser.SyntaxNode | null = callExpressionNode;
    let comments = [] as string[];

    while (
      commentNode &&
      commentNode.startPosition.row == callExpressionNode.startPosition.row
    ) {
      if (
        commentNode.parent?.startPosition.row ===
        callExpressionNode.startPosition.row
      )
        commentNode = commentNode.parent;
      else break;
    }

    let currentRow = -1;
    while ((commentNode = commentNode?.previousSibling ?? null)) {
      if (commentNode.type === SyntaxNodeType.Comment) {
        currentRow = commentNode.startPosition.row;

        let comment = commentNode.text.trim();

        if (comment.startsWith('/*')) {
          comment = comment
            .replace(/^\/\*[ ]{0,1}/, '')
            .replace(/[ ]{0,1}\*\/$/, '');

          if (formatComments) {
            comment = comment
              .split('\n')
              .map((line) => line.trim().replace(/^\*/, '').trim())
              .join('\n');
          }

          comments.unshift(comment);
        } else if (comment.startsWith('//')) {
          comments.unshift(comment.replace(/^\/\//, ''));
        }
      } else if (currentRow === commentNode.endPosition.row) {
        // If the sibling node is still on the same line, we want to continue scanning

        // If the node does not have a sibling, go to the parent as we've found at least one comment on a connecting line
        if (commentNode.previousSibling == null) {
          commentNode = commentNode.parent;
        }

        continue;
      } else {
        break;
      }
    }

    if (comments.length > 0) {
      return comments;
    }

    let row = callExpressionNode.startPosition.row - 1;
    let column = callExpressionNode.startPosition.column;
    while ((commentNode = rootNode.descendantForPosition({ row, column }))) {
      if (commentNode.type === 'comment') {
        let comment = commentNode.text.trim();
        if (comment.startsWith('/*')) {
          comments.unshift(
            comment
              .replace(/^\/\*/, '')
              .replace(/\*\/$/, '')
              .split('\n')
              .map((line) => line.trim().replace(/^\*/, '').trim())
              .join('\n')
          );
        } else if (comment.startsWith('//')) {
          comments.unshift(comment.replace(/^\/\//, ''));
        }

        if (commentNode.startPosition.row === 0) break;
        row = commentNode.startPosition.row - 1;
      } else {
        break;
      }
    }

    return comments;
  }
}

export { CStyleParser };

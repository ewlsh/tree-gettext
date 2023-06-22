/// Temporarily construct our own Xml parser from fast-xml-parser which preserves start indices
import { parseToOrderedJsObj } from 'fast-xml-parser/src/xmlparser/OrderedObjParser';
import { buildOptions } from 'fast-xml-parser/src/xmlparser/OptionsBuilder';

import XmlNode from 'fast-xml-parser/src/xmlparser/xmlNode';
import { ParseResult } from '../parse';

const addChild = XmlNode.prototype.addChild;
XmlNode.prototype.addChild = function _addChild(node) {
  addChild.call(this, node);
  this.child[this.child.length - 1].$startIndex = node.startIndex ?? null;
};

interface StringNode {
  string?: string;
  line?: number;
  comment: string;
}

type Type = 'ui' | 'xml' | 'metainfo' | 'gschema';

function cleanText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .trim();
}

function descend(node, contents: string, type: Type): StringNode[] {
  let strings = [] as StringNode[];
  let found = false;

  function lineOf(node): number {
    if (node.$startIndex) {
      const lineCount = contents.slice(0, node.$startIndex).split('\n').length;
      return lineCount;
    }

    return 0;
  }

  function cleanup$Text(text) {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  function search$Text(node) {
    if (node.$text) return cleanup$Text(node.$text);

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          const $text = search$Text(v);
          if ($text) return $text;
        }
      }
    }

    return null;
  }

  if (Array.isArray(node)) {
    node.forEach((v) => strings.push(...descend(v, contents, type)));
  } else if (typeof node === 'object') {
    const comment = node.$comment?.[0]?.$text;

    const [key] = Object.keys(node).filter(
      (key) => key !== 'attributes' && !key.startsWith('$')
    );
    if (
      type === 'ui' &&
      node.attributes?.translatable &&
      key &&
      node[key]?.[0]
    ) {
      const childNode = node[key]?.[0];

      const text = search$Text(childNode);
      if (text) {
        strings.push({ comment, string: cleanText(text), line: lineOf(node) });
        found = true;
      }
    }

    const keys = {
      gschema: ['name', 'description', 'summary'],
      metainfo: ['name', 'description', 'summary', 'developer_name', 'caption'],
    };

    const keyset = keys[type];
    if (keyset) {
      keyset.forEach((key) => {
        if (node[key]?.[0]) {
          const childNode = node[key][0];
          const text = search$Text(childNode);
          if (text) {
            strings.push({
              comment,
              string: cleanText(text),
              line: lineOf(node),
            });
            found = true;
          }
        }
      });
    }

    if (type === 'xml') {
      if (node.attributes?.description) {
        const text = node.attributes.description;
        strings.push({ comment, string: text, line: lineOf(node) });
        found = true;
      } else if (node.attributes?.name) {
        const text = node.attributes.name;
        strings.push({ comment, string: text, line: lineOf(node) });
        found = true;
      }
    }

    if (!found && comment) {
      strings.push({ comment });
    }

    if (key) {
      const valueArray = node[key];
      if (Array.isArray(valueArray)) {
        valueArray.forEach((value) => {
          strings.push(...descend(value, contents, type));
        });
      }
    }
  }

  return strings;
}

function parseXml(contents, type: Type = 'xml'): ParseResult[] {
  const options = buildOptions({
    attributeNamePrefix: '',
    ignoreAttributes: false,
    commentPropName: '$comment',
    textNodeName: '$text',
    preserveOrder: true,
    isArray: () => true,
  });

  const node = parseToOrderedJsObj(contents, options);

  let lastComment = '' as string | null;
  return descend(node, contents, type).reduce(
    (prev, { string, line, comment }) => {
      if (string) {
        const comments = [comment ?? null, lastComment].filter(
          (c): c is string => !!c?.trim?.()
        );
        if (lastComment) lastComment = null;
        prev.push({ strings: [string], line, comments });
      } else if (!line && comment) {
        lastComment = comment;
      } else {
        if (lastComment) lastComment = null;
      }
      return prev;
    },
    [] as ParseResult[]
  );
}

export { parseXml };

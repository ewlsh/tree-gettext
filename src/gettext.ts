import 'tree-sitter-javascript';
import 'tree-sitter-c';

import { singular, plural, fileHeader } from './pofile';

import { parseDesktop } from './formats/desktop';
import { parseXml } from './languages/xml';
import { JavaScriptParser } from './languages/javascript';
import { CParser } from './languages/c';
import { ParseResult } from './parse';

class Gettext {
  strings: Map<string, ParseResult[]>;
  formatComments: boolean;

  constructor({ formatComments }: { formatComments: boolean }) {
    this.strings = new Map();

    this.formatComments = formatComments;
  }

  _addEntries(entries: ParseResult[]) {
    entries.forEach((entry) => this.addString(entry));
  }

  loadXMLFile(fileName, fileSource) {
    const output = parseXml(fileSource, 'xml').map((entry) => {
      return {
        ...entry,
        fileName,
      };
    });

    this._addEntries(output);
  }

  loadGSchemaFile(fileName, fileSource) {
    const output = parseXml(fileSource, 'gschema').map((entry) => {
      return {
        ...entry,
        fileName,
      };
    });

    this._addEntries(output);
  }

  loadMetainfoFile(fileName, fileSource) {
    const output = parseXml(fileSource, 'metainfo').map((entry) => {
      return {
        ...entry,
        fileName,
      };
    });

    this._addEntries(output);
  }

  loadGladeFile(fileName, fileSource) {
    const output = parseXml(fileSource, 'ui').map((entry) => {
      return {
        ...entry,
        fileName,
      };
    });

    this._addEntries(output);
  }

  loadDesktopFile(fileName, fileSource) {
    const output = parseDesktop(fileName, fileSource);

    this._addEntries(output);
  }

  loadCFile(fileName, fileSource) {
    const output = new CParser(fileSource, fileName);

    const entries = output.parseStrings({
      formatComments: this.formatComments,
    });

    this._addEntries(entries);
  }

  loadJavaScriptFile(fileName, fileSource) {
    const output = new JavaScriptParser(fileSource, fileName);

    const entries = output.parseStrings({
      formatComments: this.formatComments,
    });

    this._addEntries(entries);
  }

  addString(entry: ParseResult) {
    const key = `${entry.context ?? ''}:${entry.strings[0]}`;

    let entries = this.strings.get(key) ?? [];
    entries.push(entry);

    if (entries.length === 1) this.strings.set(key, entries);
  }

  generatePot({ issueTracker }) {
    return [...this.strings.entries()]
      .reduce((prev, [_, entries]) => {
        const filenames = entries.map((entry) => ({
          filename: entry.fileName,
          line: entry.line,
        }));

        const comments = [
          ...new Set(entries.map((entry) => entry.comments ?? []).flat()),
        ];

        const { strings, language, context, isFormat } = entries[0];

        if (strings.length > 1) {
          return (
            prev +
            plural({
              msgid: strings[0],
              context,
              language,
              isFormat,
              msgidPlural: strings[1],
              filenames,
              comments,
            }) +
            '\n'
          );
        } else if (strings.length == 1) {
          return (
            prev +
            singular({
              msgid: strings[0],
              context,
              language,
              isFormat,
              filenames,
              comments,
            }) +
            '\n'
          );
        }

        return prev;
      }, fileHeader({ issueTracker }))
      .replace(/\n\n$/, '');
  }
}

export { Gettext };

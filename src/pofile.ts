const formattedDate = new Date()
  .toISOString()
  .replace('T', ' ')
  .replace(/:[0-9]{2}\.[0-9]+Z$/, '+0000');

const fileHeader = ({ issueTracker = '' }) => `# SOME DESCRIPTIVE TITLE.
# Copyright (C) YEAR THE PACKAGE'S COPYRIGHT HOLDER
# This file is distributed under the same license as the PACKAGE package.
# FIRST AUTHOR <EMAIL@ADDRESS>, YEAR.
#
#, fuzzy
msgid ""
msgstr ""
"Project-Id-Version: PACKAGE VERSION\\n"
"Report-Msgid-Bugs-To: ${issueTracker}\\n"
"POT-Creation-Date: ${formattedDate}\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"Language: \\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=INTEGER; plural=EXPRESSION;\\n"
\n`;

function header({ filenames, context, language, isFormat, comments }) {
  let base = '';

  let directives = '';
  if (comments) {
    comments.forEach((comment) => {
      if (
        comment &&
        (comment.trim().startsWith('xgettext:') ||
          comment.trim().startsWith('tree-gettext:'))
      ) {
        directives += `#, ${comment.split(':').slice(1).join(':')}\n`;
        return;
      }

      const commentLines = comment
        .split('\n')
        .map((line) => `#. ${line.trim()}`.trim())
        .join('\n');
      base += `${commentLines}`;
      base += '\n';
    });
  }

  if (filenames.length > 0) {
    let lastLength = -1;
    const filenameList = filenames
      .map(({ filename, line }) => `${filename}:${line}`)
      .reduce((prev, next, i) => {
        const currentLength = ` ${next}`.length;
        if (i === 0) {
          lastLength = `#: `.length + currentLength;
          return `#: ${next}`;
        } else if (lastLength && currentLength + lastLength > 80) {
          lastLength = `#: `.length + currentLength;
          return `${prev}\n#: ${next}`;
        } else {
          lastLength = lastLength + currentLength;
          return `${prev} ${next}`;
        }
      }, '');

    base += `${filenameList}\n`;
  }

  if (directives) {
    base += directives;
  }

  if (language && isFormat) {
    base += `#, ${language}-format\n`;
  }

  if (context) {
    base += `msgctxt "${context}"\n`;
  }

  return base;
}

const firstMessageLength = 80;
const messageLength = firstMessageLength - `""`.length;

function formatMsgIdLines(string, suffix) {
  const [first, ...parts] = string.split(' ');
  let key = `msgid${suffix ? `_${suffix}` : ''}`;

  const initialMessage = `${key} "${string}"`;
  if (initialMessage.length <= firstMessageLength) {
    return [initialMessage];
  }

  const { lines, currentLine } = parts.reduce(
    ({ lines, currentLine: line }, next) => {
      const append = `${line} ${next}`;
      if (append.length < messageLength) {
        return { lines, currentLine: append };
      } else {
        lines.push(`${line} "`);
        return { lines, currentLine: `"${next}` };
      }
    },
    { lines: [`${key} ""`], currentLine: `"${first}` }
  );

  return [...lines, `${currentLine}"`];
}

function msgid_({ suffix = '', msgid }) {
  let base = '';

  const sanitized = msgid
    .replace(/(?<!\\)"/gm, '\\"')
    .split('\n')
    .join('\\n');

  base += formatMsgIdLines(sanitized, suffix).join('\n');
  base += '\n';

  return base;
}

function singular({
  msgid,
  context,
  language,
  isFormat,
  filenames = [],
  comments = null,
  msgstr = '',
}: {
  msgid: string;
  language: string;
  context?: string;
  isFormat?: boolean;
  filenames: FileEntry[];
  comments: string[] | null;
  msgstr?: string;
}) {
  let base = header({ filenames, context, language, isFormat, comments });

  base += msgid_({ msgid });

  base += `msgstr "${msgstr}"\n`;

  return base;
}

export interface FileEntry {
  fileName?: string | undefined;
  line?: number | undefined;
}

function plural({
  msgid,
  language,
  context,
  isFormat,
  msgidPlural,
  filenames = [],
  comments = null,
  msgstr = '',
  msgstrPlural = '',
}: {
  msgid: string;
  language: string;
  context?: string;
  isFormat?: boolean;
  msgidPlural: string;
  filenames: FileEntry[];
  comments: string[] | null;
  msgstr?: string;
  msgstrPlural?: string;
}) {
  let base = header({ filenames, context, language, isFormat, comments });

  base += msgid_({ msgid });
  base += msgid_({ suffix: 'plural', msgid: msgidPlural });
  base += `msgstr[0] "${msgstr}"\n`;
  base += `msgstr[1] "${msgstrPlural}"\n`;

  return base;
}

export { fileHeader, header, plural, singular };

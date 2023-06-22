import fs from 'fs/promises';
import path from 'path';

import { Gettext } from '../gettext';
import { parseFileList } from '../fileList';

export async function pot(
  fileList: string,
  outputFile: string,
  formatComments: boolean = false,
  issueTracker?: string
) {
  const contents = await fs.readFile(fileList, { encoding: 'utf-8' });
  const files = parseFileList(contents);

  const gettext = new Gettext({ formatComments });

  for (const file of files) {
    // Skip empty lines...
    if (file.trim() == '') continue;

    console.log(`Parsing... ${file}`);
    const filePath = path.resolve(process.cwd(), file);

    let fileContents;
    try {
      fileContents = await fs.readFile(filePath, { encoding: 'utf-8' });
    } catch (error) {
      console.error(`Failed to load ${file} at ${filePath}`);
      continue;
    }

    const filePathExtension = filePath.replace(/\.in(?=$|\.)/g, '').trim();

    if (filePathExtension.endsWith('.js')) {
      gettext.loadJavaScriptFile(file, fileContents);
    } else if (filePathExtension.endsWith('.c')) {
      gettext.loadCFile(file, fileContents);
    } else if (filePathExtension.endsWith('.ui')) {
      gettext.loadGladeFile(file, fileContents);
    } else if (filePathExtension.endsWith('.gschema.xml')) {
      gettext.loadGSchemaFile(file, fileContents);
    } else if (filePathExtension.endsWith('.metainfo.xml')) {
      gettext.loadMetainfoFile(file, fileContents);
    } else if (filePathExtension.endsWith('.xml')) {
      gettext.loadXMLFile(file, fileContents);
    } else if (filePathExtension.endsWith('.desktop')) {
      gettext.loadDesktopFile(file, fileContents);
    } else {
      console.error(`No parser for file: ${filePath}`);
    }
  }

  const outputPath = path.resolve(process.cwd(), outputFile);

  console.log(`Outputting to ${outputPath}...`);

  await fs.writeFile(outputPath, gettext.generatePot({ issueTracker }));
}

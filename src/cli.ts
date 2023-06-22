import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pot } from './commands/pot';

yargs(hideBin(process.argv))
  .command(
    'pot [output]',
    'create a pot file from a list of translation strings',
    (yargs) => {
      return yargs
        .option('file-list', { type: 'string' })
        .demandOption('file-list', 'A list of files to parse is required')
        .positional('output', { type: 'string' })
        .option('format-comments', { type: 'boolean', default: true })
        .demandOption('output')
        .option('issue-tracker', { type: 'string' });
    },
    async (argv) => {
      await pot(
        argv.fileList,
        argv.output,
        argv.formatComments,
        argv.issueTracker
      );
    }
  )
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .parse();

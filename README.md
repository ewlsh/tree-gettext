# tree-gettext

This project uses [tree-sitter](https://github.com/tree-sitter/tree-sitter) to parse language files for translation strings. It generates a POT file that should be compatible with the output of `xgettext` and similar utilities.

## Supported Languages

* C
* JavaScript
* XML
  * UI files
  * Metainfo files
* .desktop Files

Additional languages can be added using the appropriate Tree Sitter grammar.

## Usage

```sh
# Example generating gnome-shell's POT file
tree-gettext pot --file-list=./po/POTFILES.in gnome-shell.main.pot --issue-tracker="https://gitlab.gnome.org/GNOME/gnome-shell/issues"
```
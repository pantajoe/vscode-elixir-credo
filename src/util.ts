import * as fs from 'node:fs'
import * as path from 'node:path'
import type * as vscode from 'vscode'

/**
 * Transforms a given index to a zero-based index.
 * If the index is falsy (e.g., `undefined` or `null` or `0`),
 * it will be transformed to `0`.
 *
 * @param index (1-based) index to transform
 * @returns zero-based index
 */
export function makeZeroBasedIndex(index: number | undefined | null): number {
  if (!index) return 0

  const zeroBasedIndex = index - 1
  if (zeroBasedIndex < 0) return 0

  return zeroBasedIndex
}

/**
 * Truncate a multiline string to a single line.
 *
 * @example trunc`Hello
 *  World!` // => "Hello World!"
 */
export function trunc(strings: TemplateStringsArray, ...placeholders: unknown[]): string {
  return strings.reduce((result, string, i) => result + placeholders[i - 1] + string).replace(/$\n^\s*/gm, ' ')
}

/**
 * Check if a given URI is a file URI,
 * i.e., if it has the `file://` scheme.
 */
export function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === 'file'
}

/**
 * Search for a directory (upward recursively) that contains a certain file.
 *
 * @param name filename to search for in directories
 * @param opts options for the search
 * @param opts.startAt specify start for upward recursive directory search
 * @param opts.stopAt specify stop for upward recursive directory search
 */
export function findUp(name: string, opts: { startAt: string; stopAt?: string }): string | undefined {
  const { startAt: dir, stopAt } = opts

  const filePath = path.join(dir, name)
  if (fs.existsSync(filePath)) return dir
  if (dir === stopAt) return undefined

  return findUp(name, { startAt: path.dirname(dir), stopAt })
}

import * as path from 'node:path'
import * as vscode from 'vscode'
import { findUp, isFileUri, makeZeroBasedIndex, trunc } from '../../util'

describe('Utilities', () => {
  context('#makeZeroBasedIndex', () => {
    const subject = (index: number | null | undefined) => makeZeroBasedIndex(index)

    it('An index of 1 is transformed into 0', () => {
      expect(subject(1)).to.equal(0)
    })

    it('null is transformed into 0', () => {
      expect(subject(null)).to.equal(0)
    })

    it('undefined is transformed into 0', () => {
      expect(subject(undefined)).to.equal(0)
    })

    it('a number below 0 is transformed into 0', () => {
      expect(subject(-1)).to.equal(0)
    })
  })

  context('#trunc', () => {
    it('removes any trailing new line with spaces', () => {
      const result = trunc`This
        is so
        nice times
        ${2 + 1}`

      expect(result).to.equal('This is so nice times 3')
    })
  })

  context('#isFileUri', () => {
    const subject = (uri: vscode.Uri) => isFileUri(uri)

    context('with a file uri', () => {
      it('returns true', () => {
        expect(subject(vscode.Uri.file(__filename))).to.be.true
      })
    })

    context('with a non-file uri', () => {
      it('returns false', () => {
        expect(subject(vscode.Uri.parse('http://example.com'))).to.be.false
      })
    })
  })

  context('#findUp', () => {
    let documentUri: vscode.Uri
    let mainWorkspacePath: string

    const subject = () => {
      return findUp('mix.exs', {
        startAt: path.dirname(documentUri.fsPath),
        stopAt: mainWorkspacePath,
      })
    }

    context('with a file within a mix project', () => {
      beforeEach(() => {
        mainWorkspacePath = path.resolve(__dirname, '../../../src/test')
        documentUri = vscode.Uri.file(path.resolve(mainWorkspacePath, 'fixtures/src/sample.ex'))
      })

      it('should return the path to the mix.exs file', () => {
        expect(subject()).to.equal(path.join(mainWorkspacePath, 'fixtures'))
      })
    })

    context('with a file outside of a mix project', () => {
      beforeEach(() => {
        mainWorkspacePath = path.resolve(__dirname, '../../../src/test')
        documentUri = vscode.Uri.file(path.resolve(mainWorkspacePath, 'other-fixtures/other.ex'))
      })

      it('should return undefined', () => {
        expect(subject()).to.be.undefined
      })
    })
  })
})

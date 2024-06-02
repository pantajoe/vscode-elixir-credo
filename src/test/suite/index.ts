import * as path from 'node:path'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import chaiChange from 'chai-change'
import { glob } from 'glob'
import Mocha from 'mocha'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    reporter: 'spec',
    color: true,
  })
  mocha.rootHooks({
    afterEach: () => {
      sinon.restore()
    },
  })
  chai.use(sinonChai).use(chaiChange).use(chaiAsPromised)
  globalThis.expect = chai.expect

  const testsRoot = path.resolve(__dirname, '..')

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files) => {
        // Add files to the test suite
        for (const f of files) {
          mocha.addFile(path.resolve(testsRoot, f))
        }

        try {
          // Run the mocha test
          mocha.run((failures) => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`))
            } else {
              resolve()
            }
          })
        } catch (err) {
          // biome-ignore lint/nursery/noConsole: Allowed for tests
          console.error(err)
          reject(err)
        }
      })
      .catch(reject)
  })
}

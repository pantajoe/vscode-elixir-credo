import * as path from 'node:path'
import * as Mocha from 'mocha'
import { glob } from 'glob'

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    reporter: 'spec',
    ui: 'bdd-lazy-var/global' as any,
    color: true,
  })

  const testsRoot = path.resolve(__dirname, '..')

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files) => {
        // Add files to the test suite
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

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
          console.error(err)
          reject(err)
        }
      })
      .catch(reject)
  })
}

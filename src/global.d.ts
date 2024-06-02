export type {}

declare global {
  type Nullable<T> = null | T
  // biome-ignore lint/complexity/noBannedTypes: Banned types are allowed in the global scope
  type Constructable<T = {}> = new (...input: unknown[]) => T
  type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
  type RequiredBy<T, K extends keyof T, RestPartial extends boolean = false> = (RestPartial extends true
    ? Partial<Omit<T, K>>
    : Omit<T, K>) &
    Required<Pick<T, K>>
  type LooseAutocomplete<T extends string> = T | (string & {})
  type AbstractInstanceType<T> = T extends { prototype: infer U } ? U : never
  type MaybeArray<T> = T | T[]
  type ExcludeKeys<T extends Record<string, unknown>, Excluded extends string> = T & { [key in Excluded]?: never }
  type FunctionPropertyNames<T> = {
    // biome-ignore lint/complexity/noBannedTypes: Banned types are allowed in the global scope
    [K in keyof T]: T[K] extends Function ? K : never
  }[keyof T]

  var expect: Chai.ExpectStatic

  // chai-change
  interface ChangeOptions<T> {
    by?: number
    to?: T
    from?: T
  }

  export namespace Chai {
    interface Assertion {
      /**
       * Check whether a value has changed.
       *
       * @param checker - A function that returns the value to check on changes
       * @param {ChangeOptions} options specify the change to check for:
       * - either by a number
       * - or to a value
       * - or event from a value to a value
       *
       * @example expect(() => { ... }).toChange(() => { ... }, { by: 1 })
       * @example expect(() => { ... }).toChange(() => { ... }, { to: 'foo' })
       * @example expect(() => { ... }).toChange(() => { ... }, { from: 'nice', to: 'not nice' })
       */
      alter<T>(checker: () => T, options?: ChangeOptions<Awaited<T>>): Assertion
    }
  }
}

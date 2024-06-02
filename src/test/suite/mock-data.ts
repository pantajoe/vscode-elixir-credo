import type { CredoConfiguration } from '../../configuration'

export const DefaultConfig: CredoConfiguration = {
  mixBinaryPath: '',
  mixCommand: 'mix',
  configurationFile: '.credo.exs',
  credoConfiguration: 'default',
  checksWithTag: [],
  checksWithoutTag: [],
  strictMode: false,
  ignoreWarningMessages: false,
  lintEverything: false,
  enableDebug: false,
  diffMode: {
    enabled: false,
    mergeBase: 'main',
  },
}

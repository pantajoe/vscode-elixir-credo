export default interface CredoConfiguration {
  command: string;
  onSave: boolean;
  configurationFile: string;
  credoConfiguration: string | 'default';
  strictMode: boolean;
  ignoreWarningMessages: boolean;
  lintEverything: boolean;
}

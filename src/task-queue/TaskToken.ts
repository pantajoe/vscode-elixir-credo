export default interface TaskToken {
  readonly isCanceled: boolean;
  finished(): void;
}

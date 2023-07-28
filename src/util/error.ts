/**
 * Checks if error is std error
 * @param error kind of error
 * @returns true if error is std error
 */
export function isStdError(error: any): error is { stderr: string } {
  return !!error.stderr;
}

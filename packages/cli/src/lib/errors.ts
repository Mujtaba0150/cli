/**
 * Beeper CLI exit codes:
 *   0 success
 *   1 generic runtime error
 *   2 usage error (parsing, missing required flag/arg, invalid combination)
 *   3 auth required (no stored token; user must authenticate)
 *   4 target/account not ready (target reachable but not signed-in or not verified)
 *   5 not found (selector matched nothing)
 *   6 ambiguous selector (multiple matches; use exact ID or --pick)
 */
export const ExitCodes = {
  Success: 0,
  Generic: 1,
  Usage: 2,
  AuthRequired: 3,
  NotReady: 4,
  NotFound: 5,
  Ambiguous: 6,
} as const

export type ExitCode = typeof ExitCodes[keyof typeof ExitCodes]

export class CLIError extends Error {
  readonly exitCode: ExitCode
  constructor(message: string, exitCode: ExitCode) {
    super(message)
    this.exitCode = exitCode
    this.name = 'CLIError'
  }
}

export const usageError = (message: string) => new CLIError(message, ExitCodes.Usage)
export const authRequired = (message: string) => new CLIError(message, ExitCodes.AuthRequired)
export const notReady = (message: string) => new CLIError(message, ExitCodes.NotReady)
export const notFound = (message: string) => new CLIError(message, ExitCodes.NotFound)
export const ambiguous = (message: string) => new CLIError(message, ExitCodes.Ambiguous)

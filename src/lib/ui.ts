// Thin compatibility shim — all user-facing rendering is implemented as Ink
// (React-for-terminal) components in `./ink/`. Older imports from this module
// keep working.

export { createInkSpinner as createSpinner, withInkSpinner as withSpinner, type SpinnerHandle as Spinner } from './ink/spinner.js'
export { renderEmptyState as emptyState } from './ink/render.js'
export type { Suggestion } from './ink/render.js'

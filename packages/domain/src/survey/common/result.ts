/**
 * Enterprise Rust-style Result<T, E> type for robust survey domain error handling without raw unhandled exceptions.
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export class SurveyDomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SurveyDomainError';
  }
}

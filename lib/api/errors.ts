import type { ApiError } from "@/types";

/**
 * Normalised transport failure. Everything the API layer throws is one of
 * these, so hooks and error states never have to guess at the shape.
 */
export class HttpError extends Error implements ApiError {
  readonly status?: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, status?: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Messages shown to the user for each class of failure.
 *
 * These are deliberately generic. A server message is not echoed into the UI
 * unless it arrived in the agreed envelope, because reflecting an arbitrary
 * response body back into the page turns a server fault into an injection
 * surface and can leak internal detail.
 */
const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was not valid. Please check the form and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "That record could not be found.",
  409: "This record was changed elsewhere. Reload and try again.",
  422: "Some fields need attention.",
  429: "Too many requests. Please wait a moment and try again.",
};

export function messageForStatus(status: number): string {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "The request could not be completed.";
}

/** Coerce an unknown thrown value into an ApiError for error-state rendering. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpError) {
    return {
      message: error.message,
      status: error.status,
      fieldErrors: error.fieldErrors,
    };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: "The request took too long and was cancelled." };
  }
  if (error instanceof Error) {
    // Network-level failures only. Never surface a raw server body here.
    return { message: "Could not reach the server. Check your connection." };
  }
  return { message: "An unexpected error occurred." };
}

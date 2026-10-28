// Base44 managed file: error-capture v1. Keep it as it is, and keep both middlewares first in src/start.js;
// Base44 replaces it with newer versions. Each reports the error to Base44 and rethrows it, and a 5xx response the
// app returned goes out as it is, so what a visitor gets back is unchanged.
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { recordErrorResponse, recordFunctionError, recordRequestError } from "@/lib/error-capture.server";

// Control flow, not failures: TanStack turns these into redirects, not-found pages and the thrown response.
const isControlFlow = (error) => error instanceof Response || isRedirect(error) || isNotFound(error);

// A server function's error, before TanStack serializes it for the caller.
export const errorCaptureFunctionMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, serverFnMeta }) => {
    try {
      return await next();
    } catch (error) {
      if (!isControlFlow(error)) recordFunctionError(error, serverFnMeta);
      throw error;
    }
  },
);

// An error that escapes a server route, another middleware or the page's rendering, and a 5xx one of them returns.
// A server function call's own errors come from the function middleware; what else escapes one is TanStack's (an
// unknown function id).
export const errorCaptureRequestMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request, handlerType }) => {
    let result;
    try {
      result = await next();
    } catch (error) {
      if (handlerType !== "serverFn" && !isControlFlow(error)) recordRequestError(request, error);
      throw error;
    }
    if (handlerType !== "serverFn") recordErrorResponse(request, result);
    return result;
  },
);

// Base44 managed file: error-capture v1. Keep it as it is; Base44 replaces it with newer versions.
// It reports the app's server errors to Base44, so the app's owner sees them as alerts.
import { getRequest, getResponseStatus } from "@tanstack/react-start/server";
import { env, waitUntil } from "cloudflare:workers";

// Base44 sends it only on production requests of apps whose owner turned error reporting on.
const FEED_CONTEXT_HEADER = "x-b44-feed-context";
const SECRET_MIN_CHARS = 8;
const NAME_MAX_CHARS = 64;
const MESSAGE_MAX_BYTES = 500;
const STACK_MAX_BYTES = 4 * 1024;
const LOGGED_ERRORS_KEPT = 8;
const BODY_MAX_BYTES = 2 * 1024;
const BODY_WAIT_MS = 50;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
// The errors each request recorded. One error can surface twice: a server function's error also fails the loader
// that called it. Per request, since requests can share an Error, such as a rejected init promise. A request with a
// record gets none for the 5xx it then answers.
const recorded = new WeakMap();
// The Errors each stamped request logged, newest last.
const loggedErrors = new WeakMap();

function cutBytes(text, maxBytes) {
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return text;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return decoder.decode(bytes.subarray(0, end));
}

function cutStack(stack) {
  const cut = cutBytes(stack, STACK_MAX_BYTES);
  const lineEnd = cut === stack ? -1 : cut.lastIndexOf("\n");
  return lineEnd > 0 ? cut.slice(0, lineEnd) : cut;
}

function scrubber() {
  const secrets = Object.values(env)
    .filter((value) => typeof value === "string" && value.length >= SECRET_MIN_CHARS)
    .sort((a, b) => b.length - a.length);
  return (text) => secrets.reduce((scrubbed, secret) => scrubbed.replaceAll(secret, "[redacted]"), text.toWellFormed());
}

// One `_b44_error` record for Base44's error tail. A 4xx is the caller's, and an error without a message says
// nothing: neither is recorded.
function write(request, error, { status, fn, route }) {
  if (status < 500 || !request.headers.has(FEED_CONTEXT_HEADER) || request.signal.aborted) return;
  const seen = recorded.get(request);
  if (seen?.has(error)) return;
  const raw = typeof error === "string" ? error : error?.message;
  if (typeof raw !== "string" || !raw.trim()) return;
  const scrub = scrubber();
  const record = {
    v: 1,
    kind: "response",
    status,
    name: typeof error?.name === "string" ? Array.from(scrub(error.name)).slice(0, NAME_MAX_CHARS).join("") : undefined,
    message: cutBytes(scrub(raw), MESSAGE_MAX_BYTES),
    stack: typeof error?.stack === "string" ? cutStack(scrub(error.stack)) : undefined,
    fn,
    route,
  };
  const line = { _b44_env: "prod", level: "error", message: JSON.stringify({ _b44_error: record }) };
  recorded.set(request, (seen ?? new Set()).add(error));
  console.log(line);
}

// Reporting never changes the request: any failure writes nothing.
function safely(report) {
  try {
    report();
  } catch {
    // Nothing to do.
  }
}

function stampedRequest() {
  try {
    const request = getRequest();
    return request.headers.has(FEED_CONTEXT_HEADER) ? request : undefined;
  } catch {
    return undefined; // Not inside a request.
  }
}

function remember(args) {
  const request = stampedRequest();
  if (!request) return;
  const errors = args.filter((arg) => arg instanceof Error);
  if (errors.length === 0) return;
  loggedErrors.set(request, [...(loggedErrors.get(request) ?? []), ...errors].slice(-LOGGED_ERRORS_KEPT));
}

// A 5xx the app answers itself is described from the Errors it logged.
for (const method of ["debug", "dir", "error", "info", "log", "trace", "warn"]) {
  const original = console[method];
  console[method] = (...args) => {
    safely(() => remember(args));
    return original.apply(console, args);
  };
}

// The body as JSON, if it is at most BODY_MAX_BYTES and arrives within BODY_WAIT_MS.
async function readJson(response) {
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  let timer;
  const late = new Promise((resolve) => (timer = setTimeout(resolve, BODY_WAIT_MS)));
  try {
    const chunks = [];
    let size = 0;
    for (;;) {
      const read = await Promise.race([reader.read(), late]);
      if (!read) return undefined;
      if (read.done) return JSON.parse(await new Blob(chunks).text());
      size += read.value.byteLength;
      if (size > BODY_MAX_BYTES) return undefined;
      chunks.push(read.value);
    }
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
    reader.cancel().catch(() => {});
  }
}

const strings = (value) =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

// A generic `error` gives way to the `details` beside it.
function bodyMessage(body) {
  if (!body || typeof body !== "object") return undefined;
  const generic = body.error === "Internal server error" && "details" in body;
  const fields = [generic ? undefined : body.error, body.message, body.detail, body.details, body.error?.message];
  return fields.find((value) => typeof value === "string" && value.trim());
}

// A logged Error the body repeats, else the body's own message, else the last logged Error.
function describe(body, errors) {
  const texts = strings(body);
  const repeated = errors.findLast(
    ({ message }) => typeof message === "string" && message.trim() && texts.some((text) => text.includes(message)),
  );
  return repeated ?? bodyMessage(body) ?? errors.at(-1);
}

// TanStack answers a server function's error with the status the code set, else 200.
export const recordFunctionError = (error, serverFnMeta) =>
  safely(() => {
    const status = getResponseStatus();
    write(getRequest(), error, { status: status >= 400 ? status : 500, fn: serverFnMeta?.name ?? serverFnMeta?.id });
  });

// An escaped error answers with the status it carries, as TanStack's server reads it, else 500.
export const recordRequestError = (request, error) =>
  safely(() => {
    const status = error?.status ?? error?.statusCode;
    write(request, error, { status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500 });
  });

// An errored route match renders its error component with a 500.
export const recordRouteError = (request, error, route) => safely(() => write(request, error, { status: 500, route }));

// A 5xx the app returned itself, such as a server route's caught error. The response goes out as it is; a copy of
// it is read after that.
export const recordErrorResponse = (request, result) =>
  safely(() => {
    const status = result?.response?.status;
    if (!(status >= 500) || !request.headers.has(FEED_CONTEXT_HEADER) || recorded.has(request)) return;
    const copy = result.response.clone();
    waitUntil(
      readJson(copy)
        .then((body) => {
          if (!recorded.has(request)) write(request, describe(body, loggedErrors.get(request) ?? []), { status });
        })
        .catch(() => {}),
    );
  });

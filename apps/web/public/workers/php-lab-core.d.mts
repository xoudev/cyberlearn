/** What the page sends the worker for one request, and what comes back. */
export interface LabRequest {
  method: "GET" | "POST";
  /** The path, "/search.php" */
  path: string;
  /** The query string as sent, without the "?" */
  query: string;
  /** The body as sent, "a=1&b=2" (POST only) */
  body: string;
  /** The Cookie header as sent, "session=tok-bob" */
  cookie: string;
}

export interface LabResponse {
  status: number;
  /** As headers_list() gives them: "Location: /x" */
  headers: string[];
  body: string;
  /** PHP died before it could answer (out of memory, fatal error). */
  fatal: boolean;
}

export interface PhpLab {
  run(files: Record<string, string>, request: LabRequest): Promise<LabResponse>;
}

export function createPhpLab(options: {
  /** Where the runtime's files are, as a URL ending in a slash. */
  runtimeUrl: string;
  loadModule: () => Promise<WebAssembly.Module>;
}): PhpLab;

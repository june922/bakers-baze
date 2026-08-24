"use client";

export class ApiError extends Error {}

function readCsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function apiRequest<T>(
  url: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (method !== "GET") {
    headers["x-csrf-token"] = readCsrfToken();
  }

  const response = await fetch(url, { method, headers, body });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new ApiError(result.error?.message ?? "Request failed");
  }

  return result.data as T;
}

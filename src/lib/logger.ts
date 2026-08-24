type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  const method = level === "debug" ? "log" : level;
  console[method](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};

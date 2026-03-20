interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    process.stdout.write(formatLog(entry) + "\n");
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    process.stderr.write(formatLog(entry) + "\n");
  },

  error(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    process.stderr.write(formatLog(entry) + "\n");
  },
};

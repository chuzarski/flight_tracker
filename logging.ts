import {
  configure,
  getConsoleSink,
  jsonLinesFormatter,
} from "@logtape/logtape";
import { getFileSink } from "@logtape/file";

import type { LogLevel } from "@logtape/logtape";

const logFile = Deno.env.get("LOG_FILE") || "flight_tracker.log";
const logLevel = (Deno.env.get("LOG_LEVEL") || "info") as LogLevel;

await configure({
  sinks: {
    console: getConsoleSink(),
    file: getFileSink(logFile),
  },
  loggers: [
    {
      category: "flight-tracker",
      lowestLevel: logLevel,
      sinks: ["console", "file"],
    },
  ],
});

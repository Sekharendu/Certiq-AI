#!/usr/bin/env node

type Command = "analyze" | "dashboard" | "help";

const commands: Record<Command, string> = {
  analyze: "Analyze stored telemetry and produce a model recommendation report.",
  dashboard: "Start the local dashboard for telemetry and recommendation reports.",
  help: "Show available commands."
};

/**
 * description: Prints the available Certiq AI CLI commands and their descriptions.
 * return: Nothing; help text is written to standard output.
 */
function printHelp(): void {
  console.log("Usage: certiq-ai <command>");
  console.log("");
  console.log("Commands:");
  for (const [command, description] of Object.entries(commands)) {
    console.log(`  ${command.padEnd(10)} ${description}`);
  }
}

/**
 * description: Dispatches a CLI command or reports an unknown command.
 * arg1: command - Command name supplied by the user.
 * return: Nothing; output and process status are updated as needed.
 */
function run(command: string | undefined): void {
  switch (command as Command | undefined) {
    case "analyze":
      console.log("Analyze is not implemented yet.");
      return;
    case "dashboard":
      console.log("Dashboard is not implemented yet.");
      return;
    case undefined:
    case "help":
      printHelp();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

const firstArgument = process.argv[2] === "--" ? process.argv[3] : process.argv[2];
run(firstArgument);

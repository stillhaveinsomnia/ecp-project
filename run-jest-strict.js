#!/usr/bin/env node

const path = require("path");
const { spawn } = require("child_process");

const LEAK_WARNING =
  "A worker process has failed to exit gracefully and has been force exited";

const jestBin = path.join(__dirname, "node_modules", ".bin", "jest");
const child = spawn(process.execPath, [jestBin, ...process.argv.slice(2)], {
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  output += chunk;
});

child.on("close", (code) => {
  if (output.includes(LEAK_WARNING)) {
    console.error(
      "\n❌ Jest reported a worker process that didn't exit gracefully " +
        "(leaking timers/handles). Fix the teardown before committing.",
    );
    process.exit(1);
  }
  process.exit(code ?? 1);
});

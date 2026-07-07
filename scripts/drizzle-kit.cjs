/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("child_process");

const command = process.argv[2];

if (command === "push") {
  console.error("\n❌ drizzle-kit push is disabled in this project.\n");
  console.error("Use the migration workflow instead:");
  console.error("  1. npm run db:generate   # after schema changes in db/");
  console.error("  2. npm run db:migrate    # apply migrations to the database\n");
  process.exit(1);
}

const allowedCommands = ["generate", "migrate", "studio"];

if (!command || !allowedCommands.includes(command)) {
  console.error(
    `Usage: node scripts/drizzle-kit.cjs <${allowedCommands.join("|")}>`
  );
  process.exit(1);
}

const drizzleBin = require.resolve("drizzle-kit/bin.cjs");
const result = spawnSync(
  process.execPath,
  [drizzleBin, command, ...process.argv.slice(3)],
  {
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);

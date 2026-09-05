export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Intentionally minimal: no module imports here.
  // Any module imported in this file gets compiled for the browser target too,
  // which breaks on server-only packages (better-sqlite3, fs, path).
  console.log("[instrumentation] dev server starting");
}

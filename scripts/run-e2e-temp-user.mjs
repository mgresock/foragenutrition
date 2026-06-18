// One-shot E2E verification with a disposable account.
// Creates a confirmed test user via the service role, runs the meal-builder
// spec against it, then deletes the user (cascades profile + meal_logs) in a
// finally block so nothing is left behind. Reads keys from .env.local.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const email = `e2e-${Date.now()}@forage-e2e.test`;
const password = `Test-${Math.random().toString(36).slice(2)}-${Date.now()}`;

let userId = null;
let exitCode = 1;

try {
  console.log(`Creating temp user ${email} ...`);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created user ${userId}. Running meal-builder E2E ...`);

  // Run the entire suite with creds set so the gated login + meal-builder
  // specs run authenticated alongside the credential-free auth tests.
  const result = spawnSync(
    "npx",
    ["playwright", "test", "--reporter=list"],
    {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, E2E_TEST_EMAIL: email, E2E_TEST_PASSWORD: password },
    }
  );
  exitCode = result.status ?? 1;
} catch (err) {
  console.error("Error during E2E run:", err.message ?? err);
} finally {
  if (userId) {
    console.log(`Deleting temp user ${userId} ...`);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error("Cleanup failed — delete this user manually:", userId, error.message);
    else console.log("Temp user deleted.");
  }
}

process.exit(exitCode);

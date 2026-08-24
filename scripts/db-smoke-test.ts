import "dotenv/config";
import db from "../src/lib/db";

async function main(): Promise<void> {
  const connectivity = await db.raw("select 1 + 1 as result");
  if (connectivity.rows[0].result !== 2) {
    throw new Error("Database connectivity check returned an unexpected result");
  }

  const [{ count }] = await db("phase_0a_smoke_test").count<{ count: string }[]>("id as count");
  console.log(`Database smoke test passed. phase_0a_smoke_test row count: ${count}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database smoke test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });

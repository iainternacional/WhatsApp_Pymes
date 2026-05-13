import { seedDemo } from "../src/lib/seed";

async function main() {
  const result = await seedDemo();
  console.log("[seed] OK", result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] ERROR", err);
    process.exit(1);
  });

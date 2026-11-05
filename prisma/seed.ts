// prisma/seed.ts — run with `npm run seed`
// Copies the built-in quote library into the database. Optional: the app
// already serves these quotes without a DB; use the DB to add your own.
import { PrismaClient } from "@prisma/client";
import { QUOTES } from "../src/data/quotes";

const db = new PrismaClient();

async function main() {
  await db.quote.deleteMany();
  await db.quote.createMany({
    data: QUOTES.map(({ text, author, category }) => ({ text, author, category })),
  });
  console.log(`🌱 Seeded ${QUOTES.length} quotes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

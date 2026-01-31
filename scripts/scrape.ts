import { scrapeAll, scrapeParty } from "../src/actions/admin";

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (target) {
    console.log(`Scraping target: ${target}`);
    try {
      if (target === "all") {
        await scrapeAll();
      } else {
        await scrapeParty(target);
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  } else {
    console.log("Scraping all...");
    await scrapeAll();
  }
}

main();

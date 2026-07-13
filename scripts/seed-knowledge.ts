import "dotenv/config";

import { sqlClient } from "../db/client";
import { knowledgeSeedService } from "../services/knowledge-seed.service";

async function main() {
  console.log("========== KNOWLEDGE SEED START ==========");
  console.log("Directory:", knowledgeSeedService.getKnowledgeDirectory());

  const summary = await knowledgeSeedService.seedAll();

  console.log("\n========== KNOWLEDGE SEED SUMMARY ==========");
  console.log(`Total PDFs: ${summary.total}`);
  console.log(`Ready: ${summary.readyCount}`);
  console.log(`Failed: ${summary.failedCount}`);

  for (const result of summary.results) {
    const action = result.replaced ? "replaced" : "created";
    console.log(
      `- ${result.filename}: ${result.status} (${action}, id=${result.documentId})`
    );
  }

  console.log("========== KNOWLEDGE SEED COMPLETE ==========\n");

  if (summary.failedCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("\nKnowledge seed failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sqlClient.end({ timeout: 5 });
  });

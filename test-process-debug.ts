import { processDownloadSession } from "./server/downloadProcessor";

const sessionId = process.argv[2];

if (!sessionId) {
  console.error("Usage: tsx test-process-debug.ts <sessionId>");
  process.exit(1);
}

console.log(`Testing processDownloadSession with sessionId: ${sessionId}`);

processDownloadSession(sessionId)
  .then(() => {
    console.log("✅ Processing completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Processing failed:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  });


import { processDownloadSession } from "./server/downloadProcessor";

// Pegar o sessionId da última sessão criada
const sessionId = process.argv[2];

if (!sessionId) {
  console.error("Usage: tsx test-download-debug.ts <sessionId>");
  process.exit(1);
}

console.log(`Testing download session: ${sessionId}`);

processDownloadSession(sessionId)
  .then(() => {
    console.log("✅ Processing completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Processing failed:", error);
    process.exit(1);
  });


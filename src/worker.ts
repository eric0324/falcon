import { Worker } from "bullmq";
import { connection } from "./lib/queue/connection";
import { parseUploadProcessor } from "./lib/knowledge/processors/parse-upload";
import { vectorizeProcessor } from "./lib/knowledge/processors/vectorize";

const parseUploadWorker = new Worker(
  "knowledge-parse-upload",
  parseUploadProcessor,
  { connection, concurrency: 2 }
);

const vectorizeWorker = new Worker(
  "knowledge-vectorize",
  vectorizeProcessor,
  { connection, concurrency: 3 }
);

parseUploadWorker.on("completed", (job) => {
  console.log(`[parse-upload] Job ${job.id} completed`);
});

parseUploadWorker.on("failed", (job, err) => {
  console.error(`[parse-upload] Job ${job?.id} failed:`, err.message);
});

vectorizeWorker.on("completed", (job) => {
  console.log(`[vectorize] Job ${job.id} completed`);
});

vectorizeWorker.on("failed", (job, err) => {
  console.error(`[vectorize] Job ${job?.id} failed:`, err.message);
});

console.log("Knowledge workers started");

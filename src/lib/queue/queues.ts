import { Queue } from "bullmq";
import { connection } from "./connection";

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
};

export const parseUploadQueue = new Queue("knowledge:parse-upload", {
  connection,
  defaultJobOptions,
});

export const vectorizeQueue = new Queue("knowledge:vectorize", {
  connection,
  defaultJobOptions,
});

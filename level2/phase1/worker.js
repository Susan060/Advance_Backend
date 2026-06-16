import Redis from "ioredis";
import { Queue, Worker } from "bullmq";
import sendEmail from "./lib/sendEmail.js";

const connection = new Redis("redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("Job Started");
    const email = job.data.email;
    await sendEmail(email);
    console.log("Job Completed");
  },
  { connection },
);

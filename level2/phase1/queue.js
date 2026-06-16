import Redis from "ioredis";
import { Queue } from "bullmq";

const connection = new Redis("redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const emailQueue = new Queue("emailQueue", { connection });

export default emailQueue;

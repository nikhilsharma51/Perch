import { Worker } from "bullmq";

const worker = new Worker(
  "reminders",
  async (job) => {
    console.log("processing job", job.name, job.data);
  },
  { connection: { host: "localhost", port: 6379 } }
);

worker.on("completed", (job) => console.log(`${job.id} done`));
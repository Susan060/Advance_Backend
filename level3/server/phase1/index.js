import express from "express";
import dotenv from "dotenv";
import connectDB from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";
import ratelimiter from "./middleware/ratelimit.js";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";

dotenv.config();
const app = express();
export const redis = new Redis(process.env.REDIS_URL);
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: `Hello from server ${process.env.SERVER_NAME}` });
});
// without queue
app.post("/create", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await redis.del("user:all");
    const user = await User.create({ name, email, password });
    await emailQueue.add("send-email", { email });
    return res.status(201).json({ message: "User Created Successfully" });
  } catch (error) {
    console.log(error);
  }
});
// Without reddis 267 ms
app.get("/get", ratelimiter, async (req, res) => {
  const user = await User.find({});
  return res.status(200).json(user);
});
// with redis
app.get("/get-with-redis", async (req, res) => {
  const cached = await redis.get("user:all");
  if (cached) {
    const user = JSON.parse(cached);
    return res.json(user);
  }
  const user = await User.find({});
  await redis.set("user:all", JSON.stringify(user));
  return res.status(200).json(user);
});

// otp caching
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.set(`otp:${email}`, otp, "EX", 30);

  return res.status(200).json({ otp });
});
// Verify Otp
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const cachedOtp = await redis.get(`otp:${email}`);

  if (!cachedOtp) {
    return res.status(400).json({
      message: "OTP not found or expired",
    });
  }

  if (cachedOtp !== otp) {
    return res.status(400).json({
      message: "Incorrect OTP",
    });
  }
  await redis.del(`otp:${email}`);
  return res.status(200).json({
    message: "OTP verified",
  });
});
app.listen(port, () => {
  connectDB();
  console.log(`Server started at port ${port}`);
});

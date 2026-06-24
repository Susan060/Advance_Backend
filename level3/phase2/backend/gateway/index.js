import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
dotenv.config();

const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: `Hello From ${process.env.SERVER_NAME}` });
});

app.use("/auth", proxy("http://auth-service:8001"));
app.use("/order", proxy("http://order-service:8002"));
app.use("/product", proxy("http://product-service:8003"));
app.listen(port, () => {
  console.log(`Server Started at ${port}`);
});

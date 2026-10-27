import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));
app.use(express.json({ limit: "10kb", }));
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(cookieParser())

// router import 
import { router as userRouter } from "./routes/user.route.js";
import connectDb from "./db/index.js";

app.use("/api/v1/users", userRouter);



export { app }
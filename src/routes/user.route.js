
import { Router } from "express";
import { userRegister } from "../contolers/user.contoler.js";
import { upload } from "../middlewares/multer.midlewares.js";

export const router = Router();

router.route("/register").post(
    upload.fields(
        [{
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }]
    ),
    userRegister)
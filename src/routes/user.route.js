
import { Router } from "express";
import { refreshAcsessToken, userLogin, userLogout, userRegister } from "../contolers/user.contoler.js";
import { upload } from "../middlewares/multer.midlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

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

router.route("/login").post(userLogin)
router.route("/logout").get(verifyJWT, userLogout)
router.route("/refresh-token").get(refreshAcsessToken)
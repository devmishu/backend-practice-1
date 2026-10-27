import jsonwebtoken from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {
    const token = req.cookies.acsessToken || req.header("Authorization")?.replace("Bearar ", "")

    if (!token) {
        throw new ApiError(401, "Unauthorize Acsess")
    }
    const decodedToken = await jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET);


    if (!decodedToken) {
        throw new ApiError(401, "Invalid Acssess Token")
    }

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid Acssess Token")
    }
    req.user = user;
    next()
})
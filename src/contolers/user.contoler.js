import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const options = {
    httpOnly: true,
    secure: true
}

const genaratecsessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(401, "Unauthorize Acsess")
    }

    const acsessToken = await user.genarateAcsessToken();
    const refreshToken = await user.genarateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
        refreshToken,
        acsessToken
    }
};

const userRegister = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar

    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { username, fullName, email, password } = req.body;

    if ([username, fullName, email, password].some(item => item.trim() === "")) {
        throw new ApiError(400, "All feuld are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(400, "User Alerdly Exist")
    }

    const avaterLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avaterLocalPath) {
        throw new ApiError(400, "Avater is required")
    }

    const avatar = await uploadOnCloudinary(avaterLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    if (!avatar) {
        throw new ApiError(409, "Avater is required")
    }

    const user = await User.create({
        username,
        fullName,
        email,
        password,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken")


    if (!createdUser) {
        throw new ApiError(500, "Internal Server Error")
    }


    return res.status(202).json(new ApiResponse(201, createdUser, "user crated succesfully"))

})


const userLogin = asyncHandler(async (req, res) => {
    // collect user data
    // check user password email and 
    // genarate acsess token and refresh token

    const { password, email, username } = req.body;

    if (!(email || username)) {
        throw new ApiError(400, "Email or username are required")
    }

    if (!password) {
        throw new ApiError(400, "Password are required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "Invalid Email or password")
    }

    console.log("user..", user.fullName);

    const isPasswardValid = await user.isPasswordCorrect(password);

    if (!isPasswardValid) {
        throw new ApiError(400, "Invalid Password")
    }

    const logedInUser = await User.findById(user._id).select("avatar username fullName, email")

    const { acsessToken, refreshToken } = await genaratecsessAndRefreshToken(user?._id)

    return res.status(200)
        .cookie("acsessToken", acsessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: logedInUser, refreshToken, acsessToken
        },
            "User Login Succesfully"
        ))

})

const userLogout = asyncHandler(async (req, res) => {
    // remove cookie and refresh token
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .clearCookie("acsessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User loged out succesfully"))
})

const refreshAcsessToken = asyncHandler(async (req, res) => {

    try {
        const incumingRefreshToken = req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!incumingRefreshToken) {
            throw new ApiError(401, "Unauthorize Acsess")
        }

        const decodedToken = await jwt.verify(incumingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!decodedToken) {
            throw new ApiError(401, "Unauthorize Acsess")
        }

        const user = await User.findById(decodedToken)

        if (!user) {
            throw new ApiError(401, "Unauthorize Acsess")
        }

        if (!(incumingRefreshToken === user.refreshToken)) {
            throw new ApiError(401, "refresh token is expired or used")
        }

        const { refreshToken: newRefreshToken, accessToken } = await generateAccessAndRefreshToken(user?._id);

        return res.status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Acsess Token Refreshed succefully"))
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid Refresh Token")
    }


})


const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // 1. Validate required fields
    if (
        [oldPassword, newPassword, confirmPassword].some(
            (item) => typeof item !== "string" || item.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // 2. Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
        throw new ApiError(
            400,
            "New password and confirm password do not match"
        );
    }

    // 3. Find the logged-in user
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 4. Verify the old password
    const isPasswordCorrect =
        await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid old password");
    }

    // 5. Update and save the new password
    user.password = newPassword;
    await user.save();

    // 6. Send success response
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password updated successfully"
        )
    );
});

const curentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200, req.user, "curent user get Suesfully"));
})

const updateUserInfo = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fuild are required")
    }

    const updatedUserInfo = await User.findByIdAndDelete(
        req.user._id,
        {
            $set: {
                email,
                fullName
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, updatedUserInfo, "User info update succesfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is Required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (avatar.url) {
        throw new ApiError(400, "Avatar is Required");
    }

    const updatedAvatar = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(202, updatedAvatar, "Avatar update succesfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar is Required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (coverImage.url) {
        throw new ApiError(400, "Avatar is Required");
    }

    const updatedCoverImage = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(202, updatedCoverImage, "Avatar update succesfully"))
})


const userChannelProfile = asyncHandler(async function (req, res) {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(404, "User Not found")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribeTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribeToCount: {
                    $size: "$subscribers"
                },
                isSubscribedTo: {
                    $cond: { $in: [req.user?._id, "$subscribers.subscriber"] }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])
})

export {
    userRegister,
    userLogin,
    userLogout,
    refreshAcsessToken,
    updatePassword,
    curentUser,
    updateUserInfo,
    updateUserAvatar,
    updateUserCoverImage
}
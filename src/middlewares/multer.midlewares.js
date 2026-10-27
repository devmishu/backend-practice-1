
import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, res, cb) {
        cb(null, "./public/temp")
    },
    fileName: function (req, file, cb) {
        cb(null, file.orginalname)
    }
})

export const upload = multer({
    storage
})
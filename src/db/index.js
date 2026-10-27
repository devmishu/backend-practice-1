import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
    try {
        const connectionInstanse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        console.log(`\n Mongodb Connected !!! DB HOST: ${connectionInstanse.connection.host}`);
    } catch (error) {
        console.error(`Mongodb Connection Failed: ${error}`);
    }
}

export default connectDb;
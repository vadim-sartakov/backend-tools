import mongoose from 'mongoose';

export const connectDatabase = () => {
    if (process.env.DB_URL) {
        return mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, bufferCommands: false });
    } else {
        throw new Error('Missing env variable DB_URL');
    }
};
export const disconnectDatabase = () => mongoose.connection.close(true);
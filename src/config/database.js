import mongoose from 'mongoose';

export const connectDatabase = () => {
    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }
    mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, bufferCommands: false }); 
};

export const disconnectDatabase = () => mongoose.connection.close(true);
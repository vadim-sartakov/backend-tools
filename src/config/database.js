import mongoose from 'mongoose';

export let connection;

const initialize = () => {
    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }
    connection = mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, bufferCommands: false }); 
};

export default initialize;
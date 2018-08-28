import mongoose from 'mongoose';

const initialize = () => {
    mongoose.connect('mongodb://localhost/testdb', { useNewUrlParser: true, bufferCommands: false }); 
};

export default initialize;
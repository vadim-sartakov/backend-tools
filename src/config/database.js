import mongoose from 'mongoose';

const initialize = () => {
    mongoose.connect('mongodb://localhost/testdb', { useNewUrlParser: true }); 
};

export default initialize;
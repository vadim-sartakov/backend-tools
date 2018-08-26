import mongoose from "mongoose";

const User = mongoose.model("Users");

export const getAll = (req, res) => {
    User.find({ }, "username").then(user => res.json(user));
};

export const addOne = (req, res) => {
    const newUser = new User(req.body);
    newUser.save()
        .then(user => res.json(user))
        .catch(err => res.status(401).send(err));
};

const userController = app => {
    app.route("/users")
        .get(getAll)
        .post(addOne);
};

export default userController;
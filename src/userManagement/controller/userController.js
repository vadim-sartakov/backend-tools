import User from '../model/user';

export const getAll = (req, res) => {
    User.find({ }, "username")
        .then(user => res.json(user))
        .catch(err => res.json({ message: err.message }));
};

export const getOne = (req, res, next) => {
    User.findById(req.params.id)
        .then(user => {
            if (!user) {
                next();
            } else {
                res.json(user);
            }
        })
        .catch(err => res.json({ message: err.message }));
};

export const addOne = (req, res) => {
    const newUser = new User(req.body);
    newUser.save()
        .then(user => res.json(user))
        .catch(err => res.status(401).send(err));
};

export const deleteOne = (req, res) => {
    User.deleteOne({ _id: req.params.id })
        .then(user => res.status(200).send())
        .catch(err => res.json({ message: err.message }));
}

const bindRoutes = app => {
    app.route("/users")
        .get(getAll)
        .post(addOne);
    app.route("/users/:id")
        .get(getOne)
        .delete(deleteOne);
};

export default bindRoutes;
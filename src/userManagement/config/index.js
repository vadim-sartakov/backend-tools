import User from '../model/user';
import Role from '../model/role';
import { getAll, getOne, crudRouter } from "../../controller/crudController";

const initialize = app => {



    const userRouter = crudRouter(User, {
        getAll: getAll(() => User.find({}, "username")),
        getOne: getOne(req => User.findById(req.params.id).populate({ path: "roles", model: "Role", select: "key" }))
    });

    app.use("/users", userRouter);
    app.use("/roles", crudRouter(Role));

};

export default initialize;
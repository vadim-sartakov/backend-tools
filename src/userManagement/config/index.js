import User from '../model/user';
import Role from '../model/role';
import { crudRouter } from "../../controller/crudController";

const initialize = app => {

    const router = crudRouter(User, {
        getAll: () => User.find({}, "username"),
        getOne: req => User.findById(req.params.id).populate({ path: "roles", model: "Role", select: "key" })
    });

    app.use("/users", router);
    app.use("/roles", crudRouter(Role));

};

export default initialize;
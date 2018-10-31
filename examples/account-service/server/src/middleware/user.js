import mongoose from "mongoose";
import { asyncMiddleware } from "backend-tools";
import { passwordEncoder } from "../utils/security";
import { validateField } from "../utils/validator";

export const changePassword = asyncMiddleware(async (req, res, next) => {
    validateField()
    req.body.password = await passwordEncoder.encode(req.body.password);
    const User = mongoose.model("User");
    const { id } = req.params;
    //await User.findOneAndUpdate({ _id: id }, { password: req. });

    const user = (id && await User.findOne({ _id: id })) || res.locals.user;
    //user.password = ;
});
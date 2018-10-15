import mongoose from "mongoose";

export const findOrCreateUser = async (userFindQuery, accountType, account) => {
    const User = mongoose.model("User");
    let user = await User.findOne(userFindQuery);
    if (!user) {
        user = await new User({
            roles: ["USER"],
            accounts: { [accountType]: [account] }
        }).save();
    }
    return user;
};
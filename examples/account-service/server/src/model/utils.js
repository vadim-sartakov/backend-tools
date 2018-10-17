import mongoose from "mongoose";

export const findOrCreateUser = async (userFindQuery, accountType, account) => {
    const User = mongoose.model("User");
    let user = await User.findOne(userFindQuery);
    if (!user) {
        user = new User({ roles: ["USER"] });
    }
    user.accounts[accountType].push(account);
    await user.save();
    return user;
};
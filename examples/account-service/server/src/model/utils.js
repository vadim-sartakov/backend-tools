import mongoose from "mongoose";

export const findOrCreateUser = async (loggedInUser, account) => {

    const User = mongoose.model("User");
    let user;

    user = await User.findOne({ "accounts.type": account.type, "accounts.id": account.id });
    if (user) return user;

    if (loggedInUser) {
        user = await User.findOne({ _id: loggedInUser.id });
        user.accounts.push(account);
        await user.save();
        return user;
    }

    // Should define default roles somewhere in settings
    user = new User({ roles: ["USER"], accounts: [account] });
    await user.save();
    return user;

};
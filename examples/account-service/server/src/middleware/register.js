import mongoose from "mongoose";
import fs from "fs";
import { format } from "util";
import uuidv4 from "uuid/v4";
import { asyncMiddleware } from "backend-tools";
import { mailTransport } from "../utils/mailer";
import { passwordEncoder } from "../utils/security";

const mailTemplate = JSON.parse(fs.readFileSync("./templates/registerEmail.json"));

const sendNotUnuqueError = res => {
    res.status(400);
    res.json({ message: "Username is not unique" });
};

export const checkUsername = () => asyncMiddleware(async (req, res) => {
    const User = mongoose.model("User");
    const user = await User.findOne({ "accounts.type": "local", "accounts.id": req.body.username });
    return user ? sendNotUnuqueError(res) : res.end();
});

export const sendConfirmEmail = () => asyncMiddleware(async (req, res, next) => {
    const User = mongoose.model("User");
    const { username, password, ...rest } = req.body;
    const code = uuidv4();
    const encodedPassword = await passwordEncoder.encode(password);
    const user = new User({
        accounts: [
            { type: "local", id: username, code, disabled: true }
        ],
        password: encodedPassword,
        ...rest
    });
    const error = await user.validate();
    if (error) {
        res.status(400);
        res.json(error);
        return;
    }
    try {
        await user.save();
    } catch(err) {
        return err.code === 11000 ? sendNotUnuqueError(res) : next(err);
    }
    let text = mailTemplate.textLines.reduce((prev, cur) => (prev + "\n" + cur), "");
    const link = `${req.protocol}://${req.get("host")}${req.path}/confirm?code=${code}`;
    text = format(text, link);
    mailTemplate.text = text;
    await mailTransport.sendMail(mailTemplate);
    res.end();
});

export const confirmEmail = () => asyncMiddleware(async (req, res) => {
    const User = mongoose.model("User");
    const { code } = req.query;
    const user = await User.findOne({ "accounts.type": "local", "accounts.code": code });
    if (!user) {
        res.status(400);
        res.json({ message: "Invalid code" });
        return;
    }
    const account = user.accounts[0];
    account.disabled = false;
    account.code = null;
    await user.save();
    res.end();
});

export const sendConfirmPhoneCode = () => asyncMiddleware(async (req, res) => {

    res.end();
});

/** Logged in user */
export const user = () => (req, res) => res.json(res.locals.user);
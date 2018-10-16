import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodeSSPI from "node-sspi";
import { asyncMiddleware, AccessDeniedError } from "backend-tools";
import { findOrCreateUser } from "../model/utils";

export const authJwt = key => (req, res, next) => {

    if (!req.headers.authorization) return next();

    const [schema, token] = req.headers.authorization.split(" ");
    if ((!token) || schema.toLowerCase() !== "bearer") return next();

    const payload = jwt.verify(token, key);
    res.locals.user = payload.user;

    next();

};

export const issueJwt = (key, expiresIn) => (req, res, next) => {

    let { user, loggedInUser, account } = res.locals;
    if (!loggedInUser) return next();

    if (user && user.id === loggedInUser.id) {
        user.accounts.push(account);
    } else {
        user = { id: loggedInUser.id, roles: loggedInUser.roles, accounts: [account] };
    }

    const accessToken = jwt.sign({ user }, key, { expiresIn });
    res.json({ accessToken });

};

export const oAuth2Redirect = clientOAuth2 => (req, res) => {
    const state = crypto.randomBytes(10).toString("hex");
    res.cookie("state", state, { httpOnly: true });
    const uri = clientOAuth2.code.getUri({ state });
    res.redirect(uri);
};

export const oAuth2Authenticate = (clientOAuth2, profileToAccount, axios) => asyncMiddleware(async (req, res, next) => {
    const token = await clientOAuth2.code.getToken(req.originalUrl);
    const state = req.cookies.state;
    if (req.query.state !== state) throw new Error("States are not equal");
    res.clearCookie("state");
    const request = token.sign({ method: "GET", url: clientOAuth2.options.userInfoUri });
    const profile = await axios.request(request);
    const account = { provider: clientOAuth2.options.provider, ...profileToAccount(profile.data) };
    const user = await findOrCreateUser(
        { "accounts.oAuth2.provider": account.provider, "accounts.oAuth2.id": account.id },
        "oAuth2",
        account
    );
    res.locals.loggedInUser = user;
    res.locals.account = { type: account.provider, username: account.username, accessToken: token.accessToken };
    if (token.refreshToken) res.locals.account.refreshToken = token.refreshToken;
    next();
});

export const winAuthenticate = (req, res, next) => {

    if (req.headers.authorization && req.headers.authorization.split(" ")[0] !== "NTLM") { 
        throw new Error("Request can't contain authorization header");
    }

    const nodeSSPIInstance = new nodeSSPI();
    nodeSSPIInstance.authenticate(req, res, err => (async () => {

        if (res.finished || res.locals.user) return;
        if (err) return next(err);

        const account = { username: req.connection.user, userSid: req.connection.userSid };
        const user = await findOrCreateUser({ "accounts.windows.userSid": req.connection.userSid }, "windows", account);

        res.locals.loggedInUser = user;
        res.locals.account = { type: "windows", username: account.username, userSid: account.userSid };
        next();

    })().catch(next));

};

const isPermitted = (res, roles) => {
    roles = Array.isArray(roles) ? roles : [roles];
    const { user } = res.locals;
    if (!user && roles.includes("ANON")) return true;
    if (!user) return false;
    return user.roles.some(role => roles.includes(role));
};

export const permit = roles => (req, res, next) => {
    if (isPermitted(res, roles))
        next();
    else
        throw new AccessDeniedError();
};

export const deny = roles => (req, res, next) => {
    if (!isPermitted(res, roles))
        next();
    else
        throw new AccessDeniedError();
};
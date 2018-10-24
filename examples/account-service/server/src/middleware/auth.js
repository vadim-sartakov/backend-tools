import _ from "lodash";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodeSSPI from "node-sspi";
import { asyncMiddleware, AccessDeniedError } from "backend-tools";
import { findOrCreateUser } from "../model/utils";

export const authSession = () => (req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.accounts = req.session.accounts;
    next();
};

const compactUser = user => ({ id: user._id, roles: user.roles });

const updateAccounts = (account, accounts = []) => {
    if (!accounts.some(curAccount => _.isEqual(curAccount, account))) accounts.push(account);
    return accounts;
};

export const logInSession = () => (req, res) => {
    req.session.user = res.locals.user;
    req.session.accounts = res.locals.accounts;
    res.end();
};

export const authJwt = key => (req, res, next) => {
    if (!req.headers.authorization) return next();
    const [schema, token] = req.headers.authorization.split(" ");
    if ((!token) || schema.toLowerCase() !== "bearer") return next();
    const payload = jwt.verify(token, key);
    res.locals.user = payload.user;
    res.locals.accounts = payload.accounts;
    next();
};

export const issueJwt = (key, options) => (req, res) => {
    const accessToken = jwt.sign({ user: res.locals.user, accounts: res.locals.accounts }, key, options);
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
    const account = { type: clientOAuth2.options.provider, ...profileToAccount(profile.data), accessToken: token.accessToken };
    if (token.refreshToken) res.locals.account.refreshToken = token.refreshToken;
    const user = await findOrCreateUser(res.locals.user, account);
    res.locals.user = compactUser(user);    
    res.locals.accounts = updateAccounts(account, res.locals.accounts);
    next();
});

export const winAuthenticate = (req, res, next) => {

    // Somehow "session" key conflicts with node-sspi authentication
    // We can remove it during authentication and restore it later.
    let curSession;
    if (req.session) {
        curSession = req.session;
        delete req.session;
    }
    if (req.headers.authorization && req.headers.authorization.split(" ")[0] !== "NTLM") { 
        throw new Error("Request can't contain authorization header");
    }

    const nodeSSPIInstance = new nodeSSPI();
    nodeSSPIInstance.authenticate(req, res, err => (async () => {

        if (res.finished) return;
        if (err) return next(err);

        const account = { type: "windows", id: req.connection.userSid, username: req.connection.user };
        const user = await findOrCreateUser(res.locals.user, account);

        res.locals.user = compactUser(user);
        res.locals.accounts = updateAccounts(account, res.locals.accounts);

        // Restoring session
        if (curSession) req.session = curSession;

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
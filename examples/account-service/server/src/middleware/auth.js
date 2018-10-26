import _ from "lodash";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodeSSPI from "node-sspi";
import { asyncMiddleware, AccessDeniedError, UnauthorizedError } from "backend-tools";
import { findUserByAccount, findOrCreateUser } from "../model/utils";

export const authSession = () => (req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.accounts = req.session.accounts;
    next();
};

export const oAuth2Redirect = clientOAuth2 => (req, res) => {
    const state = crypto.randomBytes(10).toString("hex");
    req.session.oauth = { ...req.session.oauth, state };
    const uri = clientOAuth2.code.getUri({ state });
    res.redirect(uri);
};

export const oAuth2Authenticate = (clientOAuth2, profileToAccount, axios) => asyncMiddleware(async (req, res) => {
    const token = await clientOAuth2.code.getToken(req.originalUrl);
    const { state } = req.session.oauth;
    if (req.query.state !== state) throw new Error("States are not equal");
    delete req.session.oauth.state;
    const request = token.sign({ method: "GET", url: clientOAuth2.options.userInfoUri });
    const profile = await axios.request(request);
    const convertedProfile = profileToAccount(profile.data);
    const account = { type: clientOAuth2.options.provider, ...convertedProfile };
    const user = await findOrCreateUser(res.locals.user, account);
    req.session.user = user._id;
    req.session.oauth = { ...req.session.oauth, github: { accessToken: token.accessToken, refreshToken: token.refreshToken, profile: convertedProfile } };
    res.end();
});

export const winAuthenticate = () => (req, res, next) => {

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
        // Restoring session
        if (curSession) req.session = curSession;
        req.session.user = user._id;
        res.end();
    })().catch(next));

};

export const localAuthenticate = () => asyncMiddleware(async (req, res) => {
    const account = { type: "local", id: req.body.username };
    const user = await findUserByAccount(account);
    if (!user || !await bcrypt.compare(req.body.password, user.password)) throw new UnauthorizedError();
    req.session.user = user._id;
    res.end();
});

const isPermitted = (res, roles) => {
    roles = Array.isArray(roles) ? roles : [roles];
    const { user } = res.locals;
    if (!user && roles.includes("ANON")) return true;
    if (!user) return false;
    return user.roles.some(role => roles.includes(role) || roles.includes("ALL"));
};

// TODO: looks like the same code
export const permit = roles => (req, res, next) => {
    if (isPermitted(res, roles)) next(); else throw new AccessDeniedError();
};

export const deny = roles => (req, res, next) => {
    if (!isPermitted(res, roles)) next(); else throw new AccessDeniedError();
};
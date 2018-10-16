import { Router } from "express";
import ClientOAuth2 from "client-oauth2";
import { oAuth2Redirect, oAuth2Authenticate, winAuthenticate } from "../middleware/auth";

export const oAuth2ClientRouter = (clientOAuth2, profileToAccount, axios, opts = {}) => {
    const router = Router();
    router.get("/", oAuth2Redirect(clientOAuth2));
    router.get(`/${opts.callbackUrl || "auth"}`, oAuth2Authenticate(clientOAuth2, profileToAccount, axios));
    return router;
};

export const githubAuthRouter = (clientId, clientSecret, axios, opts) => {
    const githubAuth = new ClientOAuth2({
        clientId: clientId,
        clientSecret: clientSecret,
        accessTokenUri: "https://github.com/login/oauth/access_token",
        authorizationUri: "https://github.com/login/oauth/authorize",
        redirectUri: "http://localhost:8080/login/github/auth",
        userInfoUri: "https://api.github.com/user",
        provider: "github"
    });
    return oAuth2ClientRouter(
        githubAuth,
        profile => ({ id: profile.id, username: profile.login }),
        axios,
        opts
    );
};

export const winAuthRouter = () => {
    const router = Router();
    router.get("/", winAuthenticate);
    return router;
};
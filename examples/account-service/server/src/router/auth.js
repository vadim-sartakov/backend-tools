import { Router } from "express";
import { oAuth2Redirect, oAuth2Authenticate, winAuthenticate } from "../middleware/auth";

export const oAuth2ClientRouter = (clientOAuth2, profileToAccount, axios, opts = {}) => {
    const router = Router();
    router.get("/", oAuth2Redirect(clientOAuth2));
    router.get(`/${opts.callbackUrl || "auth"}`, oAuth2Authenticate(clientOAuth2, profileToAccount, axios));
    return router;
};

export const winAuthRouter = () => {
    const router = Router();
    router.get("/", winAuthenticate);
    return router;
};
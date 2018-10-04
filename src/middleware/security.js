import AccessDeniedError from "../error/accessDenied";

const securityMiddleware = (req, res, next) => {
    const { permitted } = res.locals;
    if (!permitted) throw new AccessDeniedError;
    next();
};

export default securityMiddleware;
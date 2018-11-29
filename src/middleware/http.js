export const notFound = logger => (req, res) => {
    logger && logger.warn("%s requested non-existed resource %s", req.ip, req.originalUrl);
    res.status(404).send({ message: "Not found" });
};

export const internalError = logger => (err, req, res, next) => { // eslint-disable-line no-unused-vars
    logger && logger.error("%s\n%s", err.message, err.stack);
    res.status(500).send({ message: "Internal server error" });
};
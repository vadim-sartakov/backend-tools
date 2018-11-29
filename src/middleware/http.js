export const sendReqest = (req, res) => {
    res.end();
};

export const notFound = loggerCallback => (req, res) => {
    loggerCallback && loggerCallback("%s requested non-existed resource %s", req.ip, req.originalUrl);
    res.status(404).send({ message: req.t && req.t("http:notFound") });
};

export const internalError = loggerCallback => (err, req, res, next) => { // eslint-disable-line no-unused-vars
    loggerCallback && loggerCallback(err);
    res.status(500).send({ message: req.t && req.t("http:internalError"), exception: err.message });
};
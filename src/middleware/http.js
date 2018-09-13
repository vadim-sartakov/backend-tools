export const notFound = (req, res) => {
    res.status(404).send({ message: req.t && req.t("http:notFound") });
};

export const serverError = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(500).send({ message: req.t && req.t("http:internalError"), exception: err.message });
};

export default [notFound, serverError];
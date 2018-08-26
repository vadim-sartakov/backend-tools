/* global __dirname */

import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import User from './model/user';
import i18n from 'i18n';
import userController from './controller/userController';

mongoose.connect('mongodb://localhost/testdb', { useNewUrlParser: true }); 

const port = 8080;

const app = express();

i18n.configure({
    locales:['en', 'ru'],
    directory: __dirname + '/locales',
    defaultLocale: 'en'
});

app.disable('x-powered-by');
app.use(i18n.init);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

userController(app);

app.use((req, res) => {
    res.status(404).send({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    res.status(500).send({ message: "Something went wrong", exception: err.message });
});

const server = app.listen(port, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log("App listening at http://%s:%s", host, port);
});
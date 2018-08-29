import express from 'express';
import configureApp from './config/app';

export const app = express();

configureApp(app);

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    console.log("Server started at port %s", port);
});
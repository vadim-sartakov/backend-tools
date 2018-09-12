import { connectDatabase } from './config/database';
import { createApp } from './config/app';
import createLogger from './config/logger';
import initializeUserManagement from '../userManagement/config';

connectDatabase();
const app = createApp(app => {
    initializeUserManagement(app);
});

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});
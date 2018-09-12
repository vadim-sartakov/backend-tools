import initEnv from './config/env';
import createLogger from './config/logger';
import { connectDatabase } from './config/database';
import createApp from './config/app';

initEnv();
connectDatabase();

const app = createApp();

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});
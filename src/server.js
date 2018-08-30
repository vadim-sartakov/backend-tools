import app from './config/app';
import createLogger from './config/logger';
import { connectDatabase } from './config/database';

process.env.LOG_LEVEL = process.env.LOG_LEVEL || "info";

connectDatabase();

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});
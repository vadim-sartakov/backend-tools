import app from './config/app';
import logger from './config/logger';
import { connectDatabase } from './config/database';

connectDatabase();

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", `Server started at port ${port}`);
});
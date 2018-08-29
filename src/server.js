import app from './config/app';
import { connectDatabase } from './config/database';

connectDatabase();

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    console.log("Server started at port %s", port);
});
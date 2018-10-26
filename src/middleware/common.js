import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

export default [
    helmet(),
    cookieParser(),
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json()
];
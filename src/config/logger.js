import fs from 'fs';
import winston from 'winston';

export const logDirectory = "./log";

export const createLogger = () => {
    
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }

    const { combine, colorize, timestamp, splat, printf } = winston.format;
    const custom = printf(info => `${info.timestamp} ${info.level}: ${info.message}`);

    const transports = [ new winston.transports.Console({
        format: combine(colorize(), timestamp(), splat(), custom)
    }) ];

    if (process.env.NODE_ENV === "production") {
        const FileTransport = new winston.transports.File({
            filename: `${logDirectory}/app.log`,
            maxsize: 1024 * 1024 * 10,
            maxFiles: 10,
            format: combine(timestamp(), splat(), custom)
        });
        transports.push(FileTransport);
    }

    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || "debug",
        transports
    });

    return logger;

};

const logger = createLogger();

export default logger;
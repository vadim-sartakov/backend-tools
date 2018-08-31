import fs from 'fs';
import createDebug from 'debug';
import winston from 'winston';

export const logDirectory = "./log";

// Force debug parameter parsing as it was read from file.
createDebug.enable(process.env.DEBUG);

export const createLogger = labelName => {
    
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }

    const { combine, label, colorize, timestamp, splat, printf } = winston.format;
    const custom = printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`);

    const format = combine(label({ label: labelName }), timestamp(), splat(), custom);
    const transports = [ new winston.transports.Console({
        format: combine(colorize(), format)
    }) ];

    if (process.env.NODE_ENV === "production") {
        const FileTransport = new winston.transports.File({
            filename: `${logDirectory}/app.log`,
            maxsize: 1024 * 1024 * 10,
            maxFiles: 10,
            format
        });
        transports.push(FileTransport);
    }

    const debug = createDebug(labelName);
    const logger = winston.createLogger({
        level: (debug.enabled && "debug") || "info",
        transports
    });

    return logger;

};

export default createLogger;
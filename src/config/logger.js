import winston from 'winston';

export const createLogger = () => {

    const { combine, colorize, timestamp, simple, printf } = winston.format;
    const custom = printf(info => `${info.timestamp} ${info.level}: ${info.message}`);

    const transports = [ new winston.transports.Console({
        format: combine(colorize(), timestamp(), custom)
    }) ];

    if (process.env.NODE_ENV === "production") {
        const FileTransport = new winston.transports.File({
            filename: "app.log",
            maxsize: 1024 * 1024 * 10,
            maxFiles: 10,
            format: combine(timestamp(), simple(), custom)
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
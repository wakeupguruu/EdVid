type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}


class Logger {
    private isDevelopment = process.env.NODE_ENV === "development";

    private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(data && { data }),
        };
    }

    private output(entry: LogEntry): void{
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

        if (entry.data){
            // console[entry.level as keyof typeof console](
            //  `${prefix} ${entry.message}`,
            //  entry.data
            console.log(
             `${prefix} ${entry.message} - ${JSON.stringify(entry.data, null, 2)}`
            );
        } else {
            // console[entry.level as keyof typeof console](
            //  `${prefix} ${entry.message}`
            // );
            console.log(
             `${prefix} ${entry.message}`
            );
        }
    }

    error(message: string, data?: any): void {
        const entry = this.formatMessage("error", message, data);
        this.output(entry);
    }

    warn(message: string, data?: any): void {
        const entry = this.formatMessage("warn", message, data);
        this.output(entry);
    }

    info(message: string, data?: any): void {
        const entry = this.formatMessage("info", message, data);
        this.output(entry);
    }

    debug(message: string, data?: any): void {
        if (!this.isDevelopment) return;
        const entry = this.formatMessage("debug", message, data);
        this.output(entry);
    }
}

export const logger = new Logger();
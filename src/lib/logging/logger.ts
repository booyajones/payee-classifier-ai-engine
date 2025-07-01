
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date(),
      context
    };
  }

  private addToHistory(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: any, context?: string) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, data, context);
    this.addToHistory(entry);
    
    if (this.isDevelopment) {
      console.log(`[${context || 'DEBUG'}] ${message}`, data || '');
    }
  }

  info(message: string, data?: any, context?: string) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, data, context);
    this.addToHistory(entry);
    
    console.log(`[${context || 'INFO'}] ${message}`, data || '');
  }

  warn(message: string, data?: any, context?: string) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, data, context);
    this.addToHistory(entry);
    
    console.warn(`[${context || 'WARN'}] ${message}`, data || '');
  }

  error(message: string, data?: any, context?: string) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.createLogEntry('error', message, data, context);
    this.addToHistory(entry);
    
    console.error(`[${context || 'ERROR'}] ${message}`, data || '');
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => log.level === level);
  }

  clearLogs() {
    this.logs = [];
  }

  // Performance timing utilities
  time(label: string, context?: string) {
    console.time(`[${context || 'PERF'}] ${label}`);
  }

  timeEnd(label: string, context?: string) {
    console.timeEnd(`[${context || 'PERF'}] ${label}`);
  }
}

export const logger = new Logger();

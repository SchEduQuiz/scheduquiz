// Logger utility for better error handling and logging
export interface LogLevel {
  error: (message: string, error?: Error | any) => void;
  warn: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatMessage(level: string, message: string, error?: any, data?: any) {
    const timestamp = new Date().toISOString();
    const context = {
      timestamp,
      level,
      message,
      error: error ? (error instanceof Error ? error.message : error) : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    return context;
  }

  error(message: string, error?: Error | any, data?: any) {
    const context = this.formatMessage('ERROR', message, error, data);
    
    // Always log errors (both dev and prod)
    if (this.isDevelopment) {
      console.error(`${message}:`, error, data);
    } else {
      // In production, you might want to send to an error tracking service
      console.error(`${message}:`, error?.message || error);
      // TODO: Send to error tracking service like Sentry
      // this.sendToErrorService(context);
    }
  }

  warn(message: string, data?: any) {
    if (this.isDevelopment) {
      const context = this.formatMessage('WARN', message, undefined, data);
      console.warn(`${message}:`, data);
    }
  }

  info(message: string, data?: any) {
    if (this.isDevelopment) {
      const context = this.formatMessage('INFO', message, undefined, data);
      console.info(`${message}:`, data);
    }
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      const context = this.formatMessage('DEBUG', message, undefined, data);
      console.debug(`${message}:`, data);
    }
  }

  // Example method for sending errors to an external service
  private sendToErrorService(context: any) {
    // TODO: Implement error tracking service integration
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    console.log('Would send to error service:', context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper functions for common error scenarios
export const logApiError = (operation: string, error: any, additionalData?: any) => {
  logger.error(`API Error - ${operation}`, error, additionalData);
};

export const logAuthError = (operation: string, error: any, additionalData?: any) => {
  logger.error(`Authentication Error - ${operation}`, error, additionalData);
};

export const logValidationError = (operation: string, error: any, additionalData?: any) => {
  logger.error(`Validation Error - ${operation}`, error, additionalData);
};
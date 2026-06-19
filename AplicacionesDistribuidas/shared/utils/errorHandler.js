class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

class ServiceUnavailableError extends AppError {
    constructor(service = 'Service') {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
    }
}

const errorHandler = (err, req, res, next) => {
    const logger = req.app.locals.logger || console;

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (err.code === '23505') {
        // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_ERROR';
    } else if (err.code === '23503') {
        // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced resource not found';
        code = 'REFERENCE_ERROR';
    }

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
        message = 'Internal Server Error';
        code = 'INTERNAL_ERROR';
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(err.errors && { errors: err.errors }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    ServiceUnavailableError,
    errorHandler,
    asyncHandler
};

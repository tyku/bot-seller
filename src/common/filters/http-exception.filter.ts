import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'An error occurred';

    const errors =
      typeof exceptionResponse === 'object' && (exceptionResponse as any).errors
        ? (exceptionResponse as any).errors
        : undefined;

    // Log the error with context
    this.logger.error(
      `HTTP Exception: ${status} - ${request.method} ${request.url}`,
      JSON.stringify({
        message,
        errors,
        body: request.body,
        query: request.query,
        params: request.params,
      }),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
    });
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log the error with full context and stack trace
    this.logger.error(
      `Unhandled Exception: ${status} - ${request.method} ${request.url}`,
      JSON.stringify({
        message,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        body: request.body,
        query: request.query,
        params: request.params,
      }),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

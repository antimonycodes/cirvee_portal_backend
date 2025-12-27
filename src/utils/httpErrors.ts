export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}

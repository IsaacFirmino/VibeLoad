export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

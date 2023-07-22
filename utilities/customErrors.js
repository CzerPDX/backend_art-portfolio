// Custom error classes

class BadRequestError extends Error {
  constructor(message) {
      super(message);
      this.name = "BadRequestError";
      this.httpCode = 400;
  }
};

class ConflictError extends Error {
  constructor(message) {
      super(message);
      this.name = "ConflictError";
      this.httpCode = 409;
  }
};

// Utility function

// Set error to custom code if there is one
// Otherwise return 500 for general error
const getHttpCodeFromError = (err) => {
  let httpCode = 500;
  if (err.httpCode) {
    httpCode = err.httpCode;
  }
  return httpCode;
};


module.exports = {
  BadRequestError,
  ConflictError,
  getHttpCodeFromError
};
// Utility function(s)

const GENERAL_HTTP_ERROR_CODE = 500;

// Return http error code for custom errors
// Otherwise (if one does not exist) return the general http error code
const getHttpCodeFromError = (err) => {
  let httpCode = GENERAL_HTTP_ERROR_CODE;
  if (err.httpCode) {
    httpCode = err.httpCode;
  }
  return httpCode;
};


// Custom error classes

// The http request has missing or malformed arguments
class BadRequestErr extends Error {
  constructor(message) {
      super(message);
      this.name = "BadRequestErr";
      this.httpCode = 400;
  }
};

class ClientReleaseErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientReleaseErr';
    this.code = 'DB_CLIENT_RELEASE_FAILURE';
    this.httpCode = 500;
  }
}

// Trying to add a resource to the database that contains a value in its
// data that already exists and is required to be unique
class ConflictErr extends Error {
  constructor(message) {
      super(message);
      this.name = "ConflictErr";
      this.httpCode = 409;
  }
};

class DBConnectionErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'DBConnectionErr';
    this.code = 'DB_CONNECTION_FAILURE';
    this.httpCode = 503;
  }
};


class TransactionErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'TransactionErr';
    this.code = 'DB_TRANSACTION_FAILURE';
    this.httpCode = 503;
  }
}


module.exports = {
  getHttpCodeFromError,
  BadRequestErr,
  ClientReleaseErr,
  ConflictErr,
  DBConnectionErr,
  TransactionErr
};
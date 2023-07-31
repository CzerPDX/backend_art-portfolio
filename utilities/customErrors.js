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



// General Errors

// This is for missing or malformed data. 
// If a function requires something and it isn't provided or isn't provided in the proper format, use this error
class DataValidationError extends Error {
  constructor(message) {
      super(message);
      this.name = "DataValidationError";
      this.httpCode = 400;
  }
};



// Database Errors

// error encountered when trying to release the database client
class ClientReleaseErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientReleaseErr';
    this.code = 'DB_CLIENT_RELEASE_FAILURE';
    this.httpCode = 500;
  }
}

// Error encountered when trying to add a resource to the database that contains a value in its
// data that already exists and is required to be unique
class ConflictErr extends Error {
  constructor(message) {
      super(message);
      this.name = "ConflictErr";
      this.httpCode = 409;
  }
};

// Error encountered when trying to connect to the database
class DBConnectionErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'DBConnectionErr';
    this.code = 'DB_CONNECTION_FAILURE';
    this.httpCode = 503;
  }
};

// Error encountered when running a database transaction
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
  DataValidationError,
  ClientReleaseErr,
  ConflictErr,
  DBConnectionErr,
  TransactionErr
};
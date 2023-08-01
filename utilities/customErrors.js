// Utility function(s)

const GENERAL_HTTP_ERROR_CODE = 500;

// Return http error code for both custom and errors
// Errors that have a field for httpCode will return that code (ie: 404, 409, 500, etc)
// Otherwise if the field is undefined, the general server error http code is returned
const getHttpCodeFromError = (err) => {
  let httpCode = GENERAL_HTTP_ERROR_CODE;
  if (err.httpCode) {
    httpCode = err.httpCode;
  }
  return httpCode;
};


// Custom error classes

// General Errors

// Error validating request
// This is for missing or malformed info/resources from the frontend
class BadRequestErr extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestErr";
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
};

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
};


module.exports = {
  getHttpCodeFromError,
  BadRequestErr,
  ClientReleaseErr,
  ConflictErr,
  DBConnectionErr,
  TransactionErr
};
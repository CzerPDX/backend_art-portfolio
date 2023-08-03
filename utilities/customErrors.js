// Utility function(s)

const handleError = async (err, res) => {

  // Use default values in case err details were not not provided 
  // they should be defined, but this is to avoid throwing an error while handling an error)
  const errName = err.name || 'UnknownError';
  const errMessage = err.message || 'An unknown error occurred';
  const httpCode = err.httpCode || 500;
  const publicErrName = err.publicErrName || 'UnknokwnError';
  const publicErrMessage = err.publicErrMessage || 'An unknown error occurred';

  // Log the detailed error messages
  console.error(`Error of type: ${errName}: ${errMessage}`);

  // Send HTTP response using generic information
  res.status(httpCode).json({
    error: {
      name: publicErrName,
      message: publicErrMessage,
    },
  });
};

// General Error class
class BaseErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'BaseErr';

    this.publicErrMessage = 'An internal error occurred.';
    this.publicErrName = 'InternalServerError';
    this.httpCode = 500;
  };
};

// Errors having to do with bad requests
// Invalid or malformed data within the requests (includes invalid entries for user-filled fields like description, alt_text, etc)

// Bad request messages from lower layers need to contain a little more information that database errors
// so the frontend/user knows what it was that went wrong. So for BadRequest, the publicErrMessage comes from the lower-level error message
class GeneralBadRequestErr extends BaseErr {
  constructor(message) {
    super(message);
    this.name = 'BadRequest';

    this.publicErrMessage = 'Bad request';
    this.publicErrName = 'BadRequest';
    this.httpCode = 400;
  };
};

// Disallowed filetype
class InvalidFiletypeErr extends GeneralBadRequest {
  constructor(message, invalidFiletype) {
    super(message);
    this.name = 'InvalidFiletype';

    this.publicErrMessage = `Filetype ${invalidFiletype} is not allowed for upload.`;
    this.publicErrName = 'InvalidFiletype';
  };
};

class InvalidInputErr extends GeneralBadRequest {
  constructor(message) {
    super(message);
    this.name = 'InvalidInput';
  }
};


// Database Errors

// HTTP-aware database errors

// Database-related http error messages should remain generic, 
// So, for DatabaseErr, the httpResErrMessage and name are left as BaseErr's 'An internal error occurred.'
class GeneralDatabaseErr extends BaseErr {
  constructor(message) {
    super(message);
    this.name = 'DatabaseErr';

    this.httpCode = 503;
  };
};


// Conflict with an existing row for a column in the dabatase with a unique constraint (no duplicates)
class ConflictErr extends GeneralDatabaseErr {
  constructor(message, duplicateData) {
      super(message);
      this.name = 'ConflictErr';

      this.publicErrName = this.name;
      this.publicErrMessage = `${duplicateData} already exists. Please remove the existing ${duplicateData} before adding a new one.`;
      this.httpCode = 409;
  }
};

// Error encountered when trying to release the database client
class ClientReleaseErr extends GeneralDatabaseErr {
  constructor(message) {
    super(message);
    this.name = 'ClientReleaseErr';
  }
};

// Error encountered when trying to connect to the database
class DBConnectionErr extends GeneralDatabaseErr {
  constructor(message) {
    super(message);
    this.name = 'DBConnectionErr';
  }
};

// Error encountered when running a database transaction
class TransactionErr extends GeneralDatabaseErr {
  constructor(message) {
    super(message);
    this.name = 'TransactionErr';
  }
};


module.exports = {
  handleError,
  GeneralBadRequestErr,
  InvalidFiletypeErr,
  InvalidInputErr,
  GeneralDatabaseErr,
  ConflictErr,
  ClientReleaseErr,
  DBConnectionErr,
  TransactionErr,
};
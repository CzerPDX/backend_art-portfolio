// Utility function(s)

// Figure out what type of error to throw
const getErrToThrow = (err, contextMessage) => {
  let retErr;
  // If the error is already using the custom error classes, just propagate it forward
  if (err instanceof BaseErr) {
    retErr = err;
  } else {
    // If the wrapper has a custom message
    if (!contextMessage) {
      retErr = new ErrWrapper(err.message, err);
    } else {
      retErr = new ErrWrapper(contextMessage, err);
    }
  }
  return retErr;
}

const handleError = async (err, res) => {

  // Use default values in case err details were not not provided 
  // they should be defined, but this is to avoid throwing an error while handling an error)
  const errName = err.name || 'UnknownError';
  const errMessage = err.message || 'An unknown error occurred';
  const httpCode = err.httpCode || 500;
  const publicErrName = err.publicErrName || 'UnknokwnError';
  const publicErrMessage = err.publicErrMessage || 'An unknown error occurred';

  // Special responses

  // Add WWW-Authenticate header if the error is a 401
  if (httpCode === 401) {
    // If the authenticate method is valid add WWW-Authenticate header
    try {
      res.set('WWW-Authenticate', err.wwwAuthenticateMethod);
    } catch (err) {
      // Otherwise, switch the details to a 500 internal server error
      httpCode = 500;
      errName = `UnknownAuthErr`;
      errMessage = `${errMessage} However, there was an additional error generating the WWW-authenticate header: ${err.message}`;
      publicErrName = 'InternalServerErr';
      publicErrMessage = 'An internal server error occurred when authorizing.';
    }
  }

  // Log the error to the console
  console.error(errMessage);
  console.error(err.stack);

  // Send HTTP response using public information
  return res.status(httpCode).json({
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

class ErrWrapper extends BaseErr {
  constructor(message, originalErr) {
    super(`${message}: ${originalErr.message}`);
    this.originalErr = originalErr;
  }
}

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

class MissingFieldErr extends GeneralBadRequestErr {
  constructor(missingFieldName) {
    const errMsg = `${missingFieldName} was missing from the request.`;
    super(errMsg);
    this.name = 'MissingRequestField';

    this.publicErrMessage = errMsg;
    this.publicErrName = 'MissingRequestField';
  }
};

// Disallowed filetype
class InvalidFiletypeErr extends GeneralBadRequestErr {
  constructor(message) {
    super(message);
    this.name = 'InvalidFiletype';

    this.publicErrMessage = message;
    this.publicErrName = 'InvalidFiletype';
  };
};

class InvalidDataErr extends GeneralBadRequestErr {
  constructor(message) {
    super(message);
    this.name = 'InvalidData';

    this.publicErrMessage = message;
    this.publicErrName = 'InvalidData';
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
  constructor(message) {
      super(message);
      this.name = 'ConflictErr';

      this.publicErrName = this.name;
      this.publicErrMessage = message;
      this.httpCode = 409;
  }
};

class InvalidQueryErr extends GeneralDatabaseErr {
  constructor(message) {
    super(message);
    this.name = 'InvalidQueryErr';
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

class GeneralAuthenticationErr extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationErr';

    this.publicErrMessage = errMsg;
    this.publicErrName = 'AuthenticationErr';
    this.httpCode = 401;
  }
};

class InvalidAPIKey extends GeneralAuthenticationErr {
  constructor() {
    const errMsg = `Unauthorized. Invalid API Key`;
    super(errMsg);
    this.name = 'InvalidAPIKey';

    this.publicErrMessage = errMsg;
    this.publicErrName = 'InvalidAPIKey';
  }
};



module.exports = {
  getErrToThrow,
  handleError,
  BaseErr,
  ErrWrapper,
  GeneralBadRequestErr,
  InvalidFiletypeErr,
  InvalidDataErr,
  GeneralDatabaseErr,
  MissingFieldErr,
  ConflictErr,
  InvalidQueryErr,
  ClientReleaseErr,
  DBConnectionErr,
  TransactionErr,
  InvalidAPIKey,
};
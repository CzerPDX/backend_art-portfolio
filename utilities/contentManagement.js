const multer = require('multer');

const { getErrToThrow, ErrWrapper, InvalidDataErr, MissingFieldErr, GeneralBadRequestErr } = require('./customErrors');
const DBQuery = require('../utilities/dbHandler').DBQuery;
const { 
  AllowedFiletypes, 
  sanitizeFilename, 
  sanitizeInputForHTML,
  validateTagName 
} = require('./security');

require(`dotenv`).config();


// The content management class handles the functionality for uploading and deleting 
class ContentManagement {
  constructor() {
    this._FILE_BUCKET = require('../utilities/file-bucket-sdk');
    this._dbHandler = require('../utilities/dbHandler').dbHandlerInstance;
    this._easyStore = new this._FILE_BUCKET.EasyStore();
    this._filetypeValidator = new AllowedFiletypes();
  }

  // Public Methods (used by endpoints)

  // Put a file into the file bucket and send its details to the database
  async putFile(req, res) {
    try {
      // Validate the image is valid for upload and the request has all required information
      await this.#validateImageForUpload(req, res);

      // Send the image data to the database
      const successMsg = await this.#sendImageDataToDB(req);
      await this.#uploadImageToBucket(req);

      return successMsg;

    } catch (err) {
      // If uploading to the bucket failed, try to remove the entry from the database 
      try {
        await this.#removeImageFromDB(req.file.originalname);
      } catch (err) {
        throw new ErrWrapper(err, `Failed to upload to file bucket. Additional error trying to remove from database during cleanup: ${err.message}`);
      }
      throw getErrToThrow(err, `Failed to upload to file bucket`);
    }
  };

  // Remove a file from the filebucket and remove its details from the database
  async deleteFile(req) {

    // Verify that req.params and req.params.filename exists
    if (!req.params) {
      throw new MissingFieldErr('params');
    }
    if (!req.params.filename) {
      throw new MissingFieldErr('params.filename');
    }
    
    try {
      // Pull the filename out into its own variable
      const filename = req.params.filename;

      // Remove image entries from DB
      await this.#removeImageFromDB(filename);
    
      // Then remove the image entry from the file bucket
      await this.#removeImageFromBucket(filename);

      // Log success
      return `${filename} removed successfully.`;

    } catch (err) {
      throw getErrToThrow(err, `Failed to remove image`);
    }
  };

  // Get all images in the db
  // Returns an array of all rows in the portfolio_images table
  async getAllImages() {
    try {
      // Set up query
      const allImagesQueryText = `SELECT * FROM portfolio_images`;
      const allImagesQuery = new DBQuery(allImagesQueryText);

      // Execute the query and send the rows
      await this._dbHandler.executeQueries([allImagesQuery]);
      return allImagesQuery.rows;

    } catch (err) {
      throw getErrToThrow(err, `Failed to get all images`);
    }
  };

  // Get all images reated to a certain tag name in the db
  // Returns an array of portfolio_images rows matching the tagName parameter
  async getAllImagesByTag(tagName) {
    try {
      // Set up query text
      const imagesByTagNameQueryText = `
      SELECT images.*
      FROM portfolio_tags tag
      JOIN portfolio_image_tags_assoc assoc
        ON tag.tag_name = $1
      JOIN portfolio_images images
        ON images.filename = assoc.filename
      WHERE tag.tag_id = assoc.tag_id`;
      const imagesByTagNameQueryParams = [tagName];
      const imagesByTagNameQuery = new DBQuery(imagesByTagNameQueryText, imagesByTagNameQueryParams);

      // Execute the query and send the rows
      await this._dbHandler.executeQueries([imagesByTagNameQuery]);
      return imagesByTagNameQuery.rows;

    } catch (err) {
      throw getErrToThrow(err, `Failed to get images by tag name`);
    }
  };

  // Returns all entries in the filenames column from the portfolio_images table
  async getAllImageFilenames() {
    try {
      // Set up query text
      const allFilenamesQueryText = `
      SELECT images.filename
      FROM portfolio_images images`;
      const allFilenamesQuery = new DBQuery(allFilenamesQueryText);

      // Execute queries
      await this._dbHandler.executeQueries([allFilenamesQuery]);

      // Pull tag names out of object and into an array to be sent to client
      const filenames = allFilenamesQuery.rows.map(row => row.filename);
      return filenames;

    } catch (err) {
      throw getErrToThrow(err, `Failed to get all image filenames`);
    }
  };

  // Removes a tag from the portfolio_tags table
  // It will also remove related tag entries from the portfolio_image_tags_assoc table
  // If it succeeds it will return true. Failure will throw an err
  async removeImageTagFromDB(tagName) {
    try {
      // Setup Queries
      // First, remove tag entries from the portfolio_image_tags_assoc table associated with tagName
      const removeAssocsByTagQueryText = `
      DELETE FROM portfolio_image_tags_assoc assoc
      WHERE assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $1
      )`;
      const removeAssocsByTagQueryParams = [tagName];
      const removeAssocsByTagQuery = new DBQuery(removeAssocsByTagQueryText, removeAssocsByTagQueryParams);

      // Next, remove the entry from the portfolio_tags database for the tag
      const removeTagQueryText = `
      DELETE FROM portfolio_tags tags
      WHERE tags.tag_name = $1`;
      const removeTagQueryParams = [tagName];
      const removeTagQuery = new DBQuery(removeTagQueryText, removeTagQueryParams);
      
      // Execute queries
      await this._dbHandler.executeQueries([removeAssocsByTagQuery, removeTagQuery]);

    } catch (err) {
      throw getErrToThrow(err, `Failed to remove tag from the database`);
    }
  };

  // Add a new tag to the portfolio_tags table for an existing image
  async addImageTagToDB(tagName) {
    try {
      // Setup query
      const addTagQueryText = `
      INSERT INTO portfolio_tags (tag_name)
      VALUES ($1)`;
      const addTagQueryParams = [tagName];
      const addTagQuery = new DBQuery(addTagQueryText, addTagQueryParams);

      // Exercute query
      await this._dbHandler.executeQueries([addTagQuery]);

    } catch (err) {
      throw getErrToThrow(err, `Failed to add new tag to the database`);
    }
  };

  // Get all current tags from the database
  // Returns an array of tag_name from the database
  async getAllTagNames() {
    // Returns all the tags currently in the database
    try {
      // Set up query
      const allTagNamesQueryText = `
      SELECT tags.tag_name
      FROM portfolio_tags tags`;
      const allTagNamesQuery = new DBQuery(allTagNamesQueryText);

      // Execute query
      await this._dbHandler.executeQueries([allTagNamesQuery]);
  
      // Parse the return data in allTagNamesQuery.rows for return to the client
      return allTagNamesQuery.rows.map(row => row.tag_name);

    } catch (err) {
      throw getErrToThrow(err, `Failed to get all tag names`);
    }
  };

  // Removes a filename-tag association from the assoc table
  async removeImageTagAssocFromDB(filename, tagName) {
    try {
      // Set up query
      const removeAssocQueryText = `
      DELETE 
      FROM  portfolio_image_tags_assoc assoc
      WHERE assoc.filename = $1
      AND assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $2
      )`;
      const removeAssocQueryParams = [filename, tagName]
      const removeAssocQuery = new DBQuery(removeAssocQueryText, removeAssocQueryParams);

      // Execute query
      await this._dbHandler.executeQueries([removeAssocQuery]);

    } catch (err) {
      throw getErrToThrow(err, `Failed to remove image-tag association from database for ${filename}: ${tagName}`);
    }
  };

  // Mostly used for testing
  
  // Get all assocs as an array of objects that includes filename and tagName
  async getAllImageTagAssocs() {
    try {
      // Set up query
      const getAllAssocsQueryText = `
      SELECT assoc.filename, tags.tag_name
      FROM portfolio_image_tags_assoc assoc,
      portfolio_tags tags
      WHERE assoc.tag_id = tags.tag_id`;
      const getAllAssocsQuery = new DBQuery(getAllAssocsQueryText);

      // Execute query
      await this._dbHandler.executeQueries([getAllAssocsQuery]);
      return getAllAssocsQuery.rows;

    } catch (err) {
      throw getErrToThrow(err, `Failed to get image-tag associations`);
    }
  };

  // Private Methods

  // Set up where multer will be saving the file (in memory)
  #upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
  }).single('file');

  // Wrap multer's upload in a promise-based function
  #uploadAsync(req, res) {
    return new Promise((resolve, reject) => {
      this.#upload(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  // Validate file and request details and file are valid/present before uploading
  async #validateImageForUpload(req, res) {
    // Users Multer to upload the file
    await this.#uploadAsync(req, res);

    // Verify that a file was provided
    if (!req.file) {
      throw new MissingFieldErr('file');
    }
    // Validate that a body was included
    if (!req.body) {
      throw new MissingFieldErr('body');
    }
    // Validate that the descirption was included
    if (!req.body.description) {
      throw new MissingFieldErr('body.description');
    }
    // Validate that the alt_text was included
    if (!req.body.alt_text) {
      throw new MissingFieldErr('body.alt_text');
    }

    try {
      // Sanitize the image metadata for HTML formatting
      req.body.description = sanitizeInputForHTML(req.body.description);
      req.body.alt_text = sanitizeInputForHTML(req.body.alt_text);

      // Sanitize the filename for URL formatting
      req.file.originalname = sanitizeFilename(req.file.originalname);

      // Validate filetype and that the filename matches the filetype
      this._filetypeValidator.validateFiletypeAndExtension(req.file); 
    } catch (err) {
      throw getErrToThrow(err, `Failed to sanitize image`);
    }
  };

  #validateTagNames(tagNameArrAsStr) {
    try {
      // Parse the tag names from a string into an array
      const tagNameArr = JSON.parse(tagNameArrAsStr);
  
      // For each tag name in the array, validate its format
      tagNameArr.forEach((tagName) => validateTagName(tagName));

      return tagNameArr;
    } catch (err) {
      throw getErrToThrow(err, 'Failed to validate tag names');
    }
  };

  // Send an image to the file bucket
  async #uploadImageToBucket(req) {
    try {
      // Upload the file to the image bucket
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
      };

      return await this._easyStore.upload(params);

    } catch (err) {
      throw getErrToThrow(err, `Failed to upload file to bucket`);
    }
  };

  // Remove file from the image bucket
  async #removeImageFromBucket(filename) {
    try {
      // Delete the file from the image bucket
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: filename
      };

      return await this._easyStore.delete(params);
    } catch (err) {
      throw getErrToThrow(err, `Failed to remove file from bucket`);
    }
  };

  // Private Database Functions
  async #sendImageDataToDB(req) {
    let incomingTagNames;     // An array of incoming tag names for the upload
    let partialErrMsg = '';   // A partial error message if upload succeeds but tagnames fail
    const queries = [];       // Array of queries
    const bucketUrl = `${process.env._FILE_BUCKET_ENDPOINT}/${process.env.BUCKET_NAME}/${req.file.originalname}`;    // Bucket URL where the file will be located
    let filename;             // Filename of the file being uploaded

    try {
      // Pull metadata for the image out of the request into friendly variables
      filename = req.file.originalname;
      const description = req.body.description;
      const altText = req.body.alt_text;

      // Add a new row to the portfolio_images db with information for filename, bucket_url, description, and alt_text
      const addImageQueryText = `
      INSERT INTO portfolio_images (filename, bucket_url, description, alt_text)
      VALUES ($1, $2, $3, $4)`;
      const addImageQueryParams = [filename, bucketUrl, description, altText];
      const addImageQuery = new DBQuery(addImageQueryText, addImageQueryParams);
      // Add the query to the queries list
      queries.push(addImageQuery);

    } catch (err) {
      throw getErrToThrow(err, `Failed to set up query to database`);
    }

    // Validate tag name format if they were provided
    try {
      if (req.body.tags) {
        incomingTagNames = this.#validateTagNames(req.body.tags);
      }
    } catch (err) {
      // If the error is invalid data, provide a more descriptive error message otherwise general error
      if (err instanceof InvalidDataErr) {
        partialErrMsg = `However, the tag names were not provided in the correct format: ${err.message}`;
      } else {
        partialErrMsg = ' However, The tag names were not added due to an internal server error.';
      }
    }

    // Add tag queries if they exist
    try {
      // If valid tags were provided in the body, push them to queries
      if (incomingTagNames) {
        incomingTagNames = JSON.parse(req.body.tags);

        // Add valid tag names to the query list but add invalid tag names to a partial error message
        const allValidTagNames = await this.getAllTagNames();
        const invalidTagNames = [];

        // Split incoming tag names into valid (exists in databse) and invalid (does not exist in database) groups
        for (const currentTagName of incomingTagNames) {
          if (allValidTagNames.includes(currentTagName)) {
            // Add valid tags to queries list
            queries.push(this.#addImageTagAssocQuery(filename, currentTagName))
          } else {
            // Add invalid tagnames to the invalid tagnames list
            invalidTagNames.push(currentTagName);
          }
        }
        // Compose partial error success string if necessary. Include any invalid tags that were not associated with the image if they exist
        if (invalidTagNames.length > 0) {
          partialErrMsg = ` However, the following tags did not exist in the database and were not added: ${Array.from(invalidTagNames).join(' ')}`;
        }
      }

      // Execute all the queries on the queries list
      await this._dbHandler.executeQueries(queries);

      // Send success message
      return `Successfully uploaded ${bucketUrl}.${partialErrMsg}`;

    } catch (err) {
      throw getErrToThrow(err, `Failed to send image data to the database`);
    }
  };

  // Removes a row from the portfolio_images table based on filename.
  // All entries for that filename are also deleted from the assoc table
  async #removeImageFromDB(filename) {
    try {
      // Setup queries

      // Remove all entries for the filename parameter from the assoc table
      const removeAssocByFilenameQueryText = `
      DELETE FROM portfolio_image_tags_assoc assoc
      WHERE assoc.filename = $1`;
      const removeAssocByFilenameQueryParams = [filename];
      const removeAssocByFilenameQuery = new DBQuery(removeAssocByFilenameQueryText, removeAssocByFilenameQueryParams);

      // Remove the row from portfolio_images table 
      const removeImageQueryText = `
      DELETE FROM portfolio_images image
      WHERE image.filename = $1`;
      const removeImageQueryParams = [filename];
      const removeImageQuery = new DBQuery(removeImageQueryText, removeImageQueryParams);

      // Execute queries
      await this._dbHandler.executeQueries([removeAssocByFilenameQuery, removeImageQuery]);

    } catch (err) {
      throw(err);
    }
  };

  // Reused Queries
  // These methods return DBQuery objects so they can be used repeatedly throughout DBHandler as they are called
  // more than once. If new methods recreate existing queries they should be added here instead and called in both places

  // Add to association table
  #addImageTagAssocQuery(filename, tagName) {
    try {
      const addAssocQueryText = `
      INSERT INTO portfolio_image_tags_assoc (filename, tag_id)
        SELECT $1, tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $2;`;
      const addAssocQueryParams = [filename, tagName];
      return new DBQuery(addAssocQueryText, addAssocQueryParams);
    } catch (err) {
      throw err;
    }
  }
}

module.exports = { ContentManagement };
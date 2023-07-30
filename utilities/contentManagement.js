const multer = require('multer');

const { BadRequestErr, ConflictErr } = require('./customErrors');
const { AllowedFiletypes, sanitizeFilename, sanitizeInputForHTML } = require('./security');
const DBQuery = require('../utilities/dbHandler').DBQuery;

require(`dotenv`).config();


// The content management class handles the functionality for uploading and deleting 
class ContentManagement {
  constructor() {
    this.FILE_BUCKET = require('../utilities/file-bucket-sdk');
    this.dbHandler = require('../utilities/dbHandler').dbHandlerInstance;
    this.easyStore = new this.FILE_BUCKET.EasyStore();
    this.filetypeValidator = new AllowedFiletypes();
  }

  // Public Methods (used by endpoints)

  // Put a file into the file bucket and send its details to the database
  putFile = async (req, res) => {
    try {
      // Validate the image is valid for upload and the request has all required information
      await this.#validateImageForUpload(req, res);
    } catch (err) {
      throw err;
    }

    // Send the image data to the database
    try {
      await this.#sendImageDataToDB(req, res);
    } catch (err) {
      // Specific handling for unique key constraint issues
      if (err.code === 'DB_PKEY_FAILURE') {
        throw new ConflictErr(`Image already exists in the database. Remove existing database entry for this image or use a different filename. ${err.message}`)
      }
      // General failure sending to database
      else {
        throw err;
      }
    }

    // Try to send the file to the image bucket
    try {
      await this.#uploadImageToBucket(req, res);
    } catch (err) {
      // If uploading to the bucket failed, try to remove the entry from the database 
      try {
        await this.#removeImageFromDB(req.file.originalname);
      } catch (err) {
        throw new Error(`Failed to upload to file bucket. Additional error trying to remove from database during cleanup: ${err.message}`);
      }
      throw new Error(`Error uploading to image bucket: ${err.message}`);
    }
    
    return `Successfully uploaded: ${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}`;
  };

  // Remove a file from the filebucket and remove its details from the database
  deleteFile = async (req, res) => {

    // Verify that req.params exists
    if (!req.params) {
      throw new BadRequestErr('No parameters were included in the request.');
    }
    
    // Pull the filename out into its own variable
    const filename = req.params.filename;
  
    // Remove image entries from DB
    try {
      await this.#removeImageFromDB(filename);
    } catch (err) {
      throw err;
    }
    
    // Then remove the image entry from the file bucket
    try {
      await this.#removeImageFromBucket(filename);
    } catch (err) {
      throw err;
    }

    // Log success
    return `${filename} removed successfully.`;
  };

  // Get all images in the db
  // Returns an array of all rows in the portfolio_images table
  getAllImages = async () => {
    try {
      // Set up query
      const allImagesQueryText = `SELECT * FROM portfolio_images`;
      const allImagesQuery = new DBQuery(allImagesQueryText);

      // Execute the query and send the rows
      await this.dbHandler.executeQueries([allImagesQuery]);
      return allImagesQuery.rows;

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Get all images reated to a certain tag name in the db
  // Returns an array of portfolio_images rows matching the tagName parameter
  getAllImagesByTag = async (tagName) => {
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
      await this.dbHandler.executeQueries([imagesByTagNameQuery]);
      return imagesByTagNameQuery.rows;

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Returns all entries in the filenames column from the portfolio_images table
  getAllImageFilenames = async () => {
    try {
      // Set up query text
      const allFilenamesQueryText = `
      SELECT images.filename
      FROM portfolio_images images`;
      const allFilenamesQuery = new DBQuery(allFilenamesQueryText);

      // Execute queries
      await this.dbHandler.executeQueries([allFilenamesQuery]);

      // Pull tag names out of object and into an array to be sent to client
      const retArr = [];
      for (let filenameRow of  allFilenamesQuery.rows) {
        retArr.push(filenameRow.filename);
      }
      return retArr;

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };


  // Private Methods

  // Set up where multer will be saving the file (in memory)
  #upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
  }).single('file');

  // Wrap multer's upload in a promise-based function
  #uploadAsync = (req, res) => {
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

  // Checks the file type based on the first 4 bytes of the file
  #checkFileType = (buffer) => {
    try {
      // Convert the first 4 bytes of the file into a hexadecimal string
      const magicNumber = buffer.toString('hex', 0, 4);

      switch (magicNumber) {
        // JPEG Cases
        case 'ffd8ffe0':
        case 'ffd8ffe1':
        case 'ffd8ffe2':
          return this.JPG_TYPE;

        // PNG Case
        case '89504e47':
          return this.PNG_TYPE;

        // GIF Cases
        case '47494638':
          return this.GIF_TYPE;

        // Else
        default:
          return 'unknown';
      }
    } catch (err) {
      console.error(`Error checking file type: ${err.message}`);
      throw err;
    }
  };

  // Returns true or false based on whether the filetype is allowed
  #validateFileType = (incomingFile) => {
    try {
      const fileType = this.#checkFileType(incomingFile);
      return this.ALLOWED_FILETYPES.includes(fileType);
    } catch (err) {
      throw err;
    }
  };

  // Validate file and request details and file are valid/present before uploading
  #validateImageForUpload = async (req, res) => {
    // Users Multer to upload the file
    await this.#uploadAsync(req, res);

    // Verify that a file was provided
    if (!req.file) {
      throw new BadRequestErr('No file was included in the request to the backend.');
    }

    // Validate that a body was included
    if (!req.body) {
      throw new BadRequestErr('No body was included in the upload request');
    }

    // Validate that a description and alt_text was included
    if (!req.body.description || !req.body.alt_text) {
      throw new BadRequestErr('Description and alt text must be included in the request.');
    }

    // Sanitize the image metadata for HTML formatting
    req.body.description = sanitizeInputForHTML(req.body.description);
    req.body.alt_text = sanitizeInputForHTML(req.body.alt_text);

    // Sanitize the filename for URL formatting
    req.file.originalname = sanitizeFilename(req.file.originalname);

    // Validate filetype and that the filename matches the filetype
    this.filetypeValidator.validateFiletypeAndExtension(req.file); 
  };

  // Send an image to the file bucket
  #uploadImageToBucket = async (req, res) => {
    try {
      // Upload the file to the image bucket
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
      };

      return await this.easyStore.upload(params);

    } catch (err) {
      throw new Error(`Error when uploading image to file bucket: ${err.message}`);
    }
  };

  // Remove file from the image bucket
  #removeImageFromBucket = async (filename) => {
    try {
      // Delete the file from the image bucket
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: filename
      };

      return await this.easyStore.delete(params);
    } catch (err) {
      throw new Error(`Error removing file from bucket: ${err.message}`)
    }
  };


  // Private Database Functions
  #sendImageDataToDB = async (req, res) => {
    try {
      // Send image's metadata to the database
      const filename = req.file.originalname;
      const bucketUrl = `${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}`;
      const description = req.body.description;
      const altText = req.body.alt_text;

      // Set up tags to either be an empty array or to contain the tags given in the request body
      let tags;
      if (req.body.tags) {
        tags = JSON.parse(req.body.tags);
      } else {
        tags = [];
      }

      // Set up queries
      const queries = [];

      // Add a new row to the portfolio_images db with the parameter information
      const addImageQueryText = `
      INSERT INTO portfolio_images (filename, bucket_url, description, alt_text)
      VALUES ($1, $2, $3, $4)`;
      const addImageQueryParams = [filename, bucketUrl, description, altText];
      const addImageQuery = new DBQuery(addImageQueryText, addImageQueryParams);
      // Add the query to the queries list
      queries.push(addImageQuery);

      // Add a query to the queries list for each the filename-tag associations for this image
      for (let tagIdx in tags) {
        const tagName = tags[tagIdx];
        queries.push(this.#addImageTagAssocQuery(filename, tagName));
      }

      // Execute the queries on the queries list
      await this.dbHandler.executeQueries(queries);
    } catch (err) {
      throw err;
    }
  };

  // Removes a tag from the portfolio_tags table
  // It will also remove related tag entries from the portfolio_image_tags_assoc table
  // If it succeeds it will return true. Failure will throw an err
  #removeImageTagFromDB = async (tagName) => {
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
      await this.dbHandler.executeQueries([removeAssocsByTagQuery, removeTagQuery]);

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Add a new tag to the portfolio_tags table for an existing image
  #addImageTagToDB = async (tagName) => {
    try {
      // Setup query
      const addTagQueryText = `
      INSERT INTO portfolio_tags (tag_name)
      VALUES ($1)`;
      const addTagQueryParams = [tagName];
      const addTagQuery = new DBQuery(addTagQueryText, addTagQueryParams);

      // Exercute query
      await this.dbHandler.executeQueries([addTagQuery]);

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Get all current tags from the database
  // Returns an array of tag_name from the database
  #getAllTagNames = async () => {
    // Returns all the tags currently in the database
    try {
      // Set up query
      const allTagNamesQueryText = `
      SELECT tags.tag_name
      FROM portfolio_tags tags`;
      const allTagNamesQuery = new DBQuery(allTagNamesQueryText);

      // Execute query
      await this.dbHandler.executeQueries([allTagNamesQuery]);

      // Parse the return data in allTagNamesQuery.rows for return to the client
      const retArr = [];
      for (let tagName of  allTagNamesQuery.rows) {
        retArr.push(tagName.tag_name);
      }
      return retArr;

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Adds a filename-tag association to the assoc table
  #addImageTagAssocToDB = async (filename, tagName) => {
    try {
      await this.dbHandler.executeQueries([this.#addImageTagAssocQuery(filename, tagName)]);
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Removes a filename-tag association from the assoc table
  #removeImageTagAssocFromDB = async (filename, tagName) => {
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
      await this.dbHandler.executeQueries([removeAssocQuery]);

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Get all assocs as an array of objects that includes filename and tagName
  #getAllImageTagAssocs = async () => {
    try {
      // Set up query
      const getAllAssocsQueryText = `
      SELECT assoc.filename, tags.tag_name
      FROM portfolio_image_tags_assoc assoc,
      portfolio_tags tags
      WHERE assoc.tag_id = tags.tag_id`;
      const getAllAssocsQuery = new DBQuery(getAllAssocsQueryText);

      // Execute query
      await this.dbHandler.executeQueries([getAllAssocsQuery]);
      return getAllAssocsQuery.rows;

    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Removes a row from the portfolio_images table based on filename.
  // All entries for that filename are also deleted from the assoc table
  #removeImageFromDB = async (filename) => {
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
      await this.dbHandler.executeQueries([removeAssocByFilenameQuery, removeImageQuery]);

    } catch (err) {
      console.error(err.message);
      throw(err);
    }
  };

  

  // Reused Queries
  // These methods return DBQuery objects so they can be used repeatedly throughout DBHandler as they are called
  // more than once. If new methods recreate existing queries they should be added here instead and called in both places

  // Add to association table
  #addImageTagAssocQuery = (filename, tagName) => {
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
const multer = require('multer');

const { BadRequestError, ConflictError } = require('./customErrors');


require(`dotenv`).config();

// Classes to throw errors with

class ContentManagement {
  constructor() {
    this.FILE_BUCKET = require('../utilities/file-bucket-sdk');
    this.dbHandler = require('../utilities/dbHandler');
    this.easyStore = new this.FILE_BUCKET.EasyStore();
    
    this.JPG_TYPE = 'image/jpeg';
    this.PNG_TYPE = 'image/png';
    this.GIF_TYPE = 'image/gif';
    this.ALLOWED_FILETYPES = [
      this.JPG_TYPE, 
      this.PNG_TYPE, 
      this.GIF_TYPE
    ];
  }

  // Public Methods

  putFile = async (req, res) => {
    // Try to add the entry to the database
    try {
      await this.#getFileReadyForUpload(req, res);
    } catch (err) {
      throw err;
    }

    try {
      await this.#sendToDB(req, res);
    } catch (err) {
      // Specific handling for unique key constraint issues
      if (err.code === 'DB_PKEY_FAILURE') {
        throw new ConflictError(`Image already exists in the database. Remove existing database entry for this image or use a different filename. ${err.message}`)
      }
      // General failure sending to database
      else {
        throw err;
      }
    }

    // Try to send the file to the image bucket
    try {
      await this.#uploadToBucket(req, res);
    } catch (err) {
      // If uploading to the bucket failed, try to remove the entry from the database 
      try {
        await this.dbHandler.removeImageFromDB(req.file.originalname);
      } catch (err) {
        throw new Error(`Failed to upload to file bucket. Additional error trying to remove from database during cleanup: ${err.message}`);
      }
      throw new Error(`Error uploading to image bucket: ${err.message}`);
    }
    
    return `Successfully uploaded: ${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}`;
  };

  // Remove a file from both the database and the file bucket
  deleteFile = async (req, res) => {

    // Verify parameters exist
    if (!req.params) {
      throw new BadRequestError('No parameters were included in the request.');
    }
    
    const filename = req.params.filename;
  
    // Remove image entries from DB
    try {
      await this.dbHandler.removeImageFromDB(filename);
    } catch (err) {
      throw err;
    }
    
    // Then remove the image entry from the file bucket
    try {
      await this.#removeFromBucket(filename);
    } catch (err) {
      throw err;
    }

    return `${filename} removed successfully.`;
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

  // Validate file and request details in preparation for upload
  #getFileReadyForUpload = async (req, res) => {
    await this.#uploadAsync(req, res);

    // Verify that a file was provided
    if (!req.file) {
      throw new BadRequestError('No file was included in the request to the backend.');
    }

    // Validate that a body was included
    if (!req.body) {
      throw new BadRequestError('No body was included in the upload request');
    }

    // Validate that a description and alt_text was included
    if (!req.body.description || !req.body.alt_text) {
      throw new BadRequestError('Description and alt text must be included in the request.');
    }

    // Validate that the filetype provided is allowed (JPG, PNG, GIF)
    if (!this.#validateFileType(req.file.buffer)) {
      throw new BadRequestError('Invalid file type.');
    }
  };

  // Send a file to the file bucket
  #uploadToBucket = async (req, res) => {
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
  #removeFromBucket = async (filename) => {
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

  #sendToDB = async (req, res) => {
    try {
      // Send image's metadata to the database
      const filename = req.file.originalname;
      const bucketUrl = `${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}`;
      const description = req.body.description;
      const altText = req.body.alt_text;
      return await this.dbHandler.addImageToDB(filename, bucketUrl, description, altText);
    } catch (err) {
      throw err;
    }
  };
}



module.exports = { ContentManagement };
// The EasyStore class is supposed to offer a similar interface to S3's REST API (but only includes a small subset of methods)
// However, it does not interface with S3, rather it interfaces with a file bucket that imitates S3
// This will make it easier to refactor to replace this file with AWS S3 REST API interface later.

// References:
// https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_Simple_Storage_Service.html
// https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
// https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
// https://stackoverflow.com/questions/57420576/how-to-synchronously-upload-files-to-s3-using-aws-sdk

const axios = require('axios');
const FormData = require('form-data');

class EasyStore {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.FILE_BUCKET_ENDPOINT;
    this.apiKey = options.apiKey || process.env.FILE_BUCKET_API_KEY;
  }

  async #sendReq(options) {
    try {
      const response = await axios(options);
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        throw new Error('Request failed: ' + response.message);
      }
    } catch (error) {
      const errMsg = error.message || 'Unknown error when sending request to bucket.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  // Upload an item to the bucket
  async upload(params) {
    try {
      let formData = new FormData();
      formData.append('file', params.Body, params.Key);

      const options = {
        baseURL: this.endpoint,
        url: `/${params.Bucket}`,
        method: 'PUT',
        data: formData,
        headers: {
          'x-api-key': this.apiKey,
          ...formData.getHeaders()
        },
      };

      const uploadResponse = await this.#sendReq(options);

      return uploadResponse;
    } catch (error) {
      const errMsg = error.message;
      console.error(errMsg);
      throw new Error(errMsg);
    }

  }
    

  // Delete an item from the bucket
  async delete(params) {
    const options = {
      baseURL: this.endpoint,
      url: `/${params.Bucket}/${params.Key}`,
      method: 'DELETE',
      headers: {
        'x-api-key': this.apiKey,
      },
    };
    
    return await this.#sendReq(options);
  }
}

module.exports = {
  EasyStore,
};

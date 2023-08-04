// https://jestjs.io/docs/getting-started

const { ContentManagement } = require('./contentManagement');
const dbHandler = require('./dbHandler').dbHandlerInstance;
const contentManagement = new ContentManagement();

require('dotenv').config();

// Utils
const doesTagNameExist = async (tagName) => {
  const allTagNames = await contentManagement.getAllTagNames();
  return allTagNames.includes(tagName);
};



// const doesFilenameExist = async (filename) => {
//   const allFilenames = await dbHandler.getAllFilenames();
//   return allFilenames.includes(filename);
// };

// const doesAssocExist = async (filename, tagName) => {
//   const allAssocs = await dbHandler.getAllAssocs();
//   let found = false;
//   for (let assoc of allAssocs) {
//     if ((assoc.filename === filename) && (assoc.tag_name === tagName)) {
//       found = true;
//     }
//   }
//   return found;
// };

beforeAll(async () => {
  try {
    // Setup dbHandler before tests
    await dbHandler.setupHandler();
  } catch (error) {
    console.error(`Error setting up pool: ${error}`);
  }
});

afterAll(async () => {
  try {
    // Cleanup dbHandler after tests
    await dbHandler.cleanupHandler();
  } catch (error) {
    console.error(`Error closing down pool: ${error}`);
  }
});

// Tests
test('Add and remove a tag from portfolio_tags table', async () => {
  const tagName = 'tag-add-remove-test';

  try {
    // Setup test
    console.log('TESTING');
    console.log(`Does new tagname exist?   ${await doesTagNameExist(tagName)}`);
    console.log(`Does existing tagname exist?   ${await doesTagNameExist('illustration')}`);
    
    // If tag exists, remove it
    if (await doesTagNameExist(tagName)) {
      await dbHandler.removeImageTagFromDB(tagName);
    }
      
    // Begin test
    // Verify the tag does not yet exist
    expect(await doesTagNameExist(tagName)).toBe(false);
    // Add the tag and verify it exists
    await dbHandler.addTagToDB(tagName);
    expect(await doesTagNameExist(tagName)).toBe(true);
    // Remove the tag and verify it no longer exists
    await dbHandler.removeTagFromDB(tagName)
    expect(await doesTagNameExist(tagName)).toBe(false);

  } catch (error) {
    console.error(`Test failed with error: ${error}`);
    throw(error);
  }
});

// test('Add and remove an image from portfolio_images table', async () => {
//   try {
//     // Setup test
//     const filename = 'image-add-remove-test.jpg';
//     const bucketUrl = 'http://a-test-bucket-url.com';
//     const description = 'descriptive test description';
//     const altText = 'alt text alternatively textual';
//     // If image exists, remove it
//     if (await doesFilenameExist(filename)) {
//       await dbHandler.removeImageFromDB(filename);
//     }

//     // Begin test
//     // Verify the image does not yet exist
//     expect(await doesFilenameExist(filename)).toBe(false);
//     // Add the file and verify it exists now
//     await dbHandler.addImageToDB(filename, bucketUrl, description, altText);
//     expect(await doesFilenameExist(filename)).toBe(true);
//     // Remove the image and verify it no longer exists
//     await dbHandler.removeImageFromDB(filename);
//     expect(await doesFilenameExist(filename)).toBe(false);
//   } catch (error) {
//     console.error(`Test failed with error: ${error}`);
//     throw(error);
//   }
// });

// test('Add and remove an association from portfolio_image_tags_assoc table', async () => {
//   try {
//     // Setup test
//     const tagName = 'assoc-add-remove-test';
//     const filename = 'assoc-add-remove-test.jpg';
//     const bucketUrl = 'http://a-test-bucket-url.com';
//     const description = 'description test text';
//     const altText = 'alt text test';
//     // If test tag does not exist, add it
//     // const tagExistResult = await doesTagNameExist(tagName);
//     if (!await doesTagNameExist(tagName)) {
//       await dbHandler.addTagToDB(tagName);
//       expect(await doesTagNameExist(tagName)).toBe(true);
//     }
//     // If test image does not exist, add it
//     if (!await doesFilenameExist(filename)) {
//       await dbHandler.addImageToDB(filename, bucketUrl, description, altText);
//       expect(await doesFilenameExist(filename)).toBe(true);
//     }
//     // If assoc exists, remove it
//     if (await doesAssocExist(filename, tagName)) {
//       await dbHandler.removeAssocFromDB(filename, tagName);
//       expect(await doesAssocExist(filename, tagName)).toBe(true);
//     }

//     // Begin test
//     // Verify the assoc does not yet exist
//     expect(await doesAssocExist(filename, tagName)).toBe(false);
//     // Add it the association and verify that it exists
//     await dbHandler.addAssocToDB(filename, tagName)
//     expect(await doesAssocExist(filename, tagName)).toBe(true);
//     // Remove assoc and verify it no longer exists
//     await dbHandler.removeAssocFromDB(filename, tagName)
//     expect(await doesAssocExist(filename, tagName)).toBe(false);

//     // Cleanup test
//     // Remove test tag if it exists
//     if (await doesTagNameExist(tagName)) {
//       await dbHandler.removeTagFromDB(tagName);
//     }
//     // Remove test image
//     if (await doesFilenameExist(filename)) {
//       await dbHandler.removeImageFromDB(filename);
//     }
//   } catch (error) {
//     console.error(`Test failed with error: ${error}`);
//     throw(error);
//   }
// }, 80000);

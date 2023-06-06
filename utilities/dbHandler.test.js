// https://jestjs.io/docs/getting-started

const dbHandler = require('./dbHandler');
require('dotenv').config();

// Test variables
const tagName = 'a-new-tag-for-testing';
const filename = 'a-test-filename.jpg';
const bucketUrl = 'http://a-test-bucket-url.com';
const description = 'descriptive test description';
const altText = 'alt text alternatively textual';
const tags = [tagName, 'illustration'];

// Utils
const doesTagNameExist = async (tagName) => {
  const allTagNames = await dbHandler.getAllTagNames();
  return allTagNames.includes(tagName);
}

const doesFilenameExist = async (filename) => {
  const allFilenames = await dbHandler.getAllFilenames();
  return allFilenames.includes(filename);
}

// Tests
test('Add and remove a tag from portfolio_tags table', async () => {
  try {
    // Setup test
    // If tag exists, remove it
    if (await doesTagNameExist(tagName)) {
      await dbHandler.removeTagFromDB(tagName);
    }
      
    // Begin test
    // Verify the tag does not yet exist
    expect(await doesTagNameExist(tagName)).toBe(false);
    // Add the tag and verify it exists
    expect(await dbHandler.addTagToDB(tagName)).toBe(true);
    expect(await doesTagNameExist(tagName)).toBe(true);
    // Remove the tag and verify it no longer exists
    expect(await dbHandler.removeTagFromDB(tagName)).toBe(false);
    expect(await doesTagNameExist(tagName)).toBe(false);

  } catch (error) {
    // Jest will automatically fail the test when a thrown error reaches this block
    console.error(`Test failed with error: ${error}`);
  }
}), 6000;


test('Add and remove an image from portfolio_images table', async () => {
  // Setup test
  // If image exists, remove it
  if (await doesFilenameExist(filename)) {
    await dbHandler.removeImageFromDB(filename);
  }

  // Begin test
  // Verify the image does not yet exist
  expect(await doesFilenameExist(filename)).toBe(false);
  // Add the file and verify it exists now
  expect(await dbHandler.addImageToDB(filename, bucketUrl, description, altText, tags)).toBe(true);
  expect(await doesFilenameExist(filename)).toBe(true);
  // Remove the image and verify it no longer exists
  expect(await dbHandler.removeImageFromDB(filename)).toBe(true);
  expect(await doesFilenameExist(filename)).toBe(false);
});

// test('Add and remove an association from portfolio_image_tags_assoc table', async () => {
//   // Setup test
//     // If test tag does not exist, add it
//     // If test image does not exist, add it
//     // If assoc exists, remove it

//   // Begin test
//   // Add assoc
//     // Verify the assoc does not yet exist
//     // Add it
//     // Check that it exists
//   // Remove assoc
//     // Remove the assoc
//     // Verify it no longer exists

//   // Cleanup test
//     // Remove test tag
//     // Remove test image
// });


// Clean up the dbHandler after it's done being used
dbHandler.cleanupHandler();
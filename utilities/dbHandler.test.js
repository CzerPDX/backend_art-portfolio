// https://jestjs.io/docs/getting-started

const dbHandler = require('./dbHandler');
require('dotenv').config();

// Test variables
const tagName = 'dbHandler-test-tag';
const filename = 'a-test-filename.jpg';
const bucketUrl = 'atestbucketur.com';
const description = 'descriptive test description';
const altText = 'alt text alternatively textual';
const tags = [tagName, 'illustration'];

const doesTagNameExist = async (tagName) => {
  return await dbHandler.getAllTagNames().includes(tagName);
}

test('Add and remove a tag from portfolio_tags table', async () => {
  // Setup test
  // If tag exists, remove it
  if (await doesTagNameExist(tagName)) {
    await dbHandler.removeTagFromDB(tagName);
  }
    
  // Begin test
  // Verify the tag does not yet exist
  expect(await doesTagNameExist(tagName)).toBe(false);
  // Add the tag and verify results
  const addTagResult = await dbHandler.addTagToDB(tagName);
  expect(addTagResult).toBe(true);
  expect(await doesTagNameExist(tagName)).toBe(true);
  // Remove the tag
  const removeTagResult = await dbHandler.removeTagFromDB(tagName);
  expect(removeTagResult).toBe(false);
  expect(await doesTagNameExist(tagName)).toBe(false);
});

// test('Add and remove an image from portfolio_images table', async () => {
//   // Setup test
//     // If image exists, remove it

//   // Begin test
//   // Add image
//     // Verify the image does not yet exist
//     // Add it
//     // Check that it exists
//   // Remove image
//     // Remove the image
//     // Verify it no longer exists
// });

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
// https://jestjs.io/docs/getting-started

const DBHandler = require('./dbHandler');
require('dotenv').config();

// Use this database handler for tests so the pool can be shared between them
const dbHandler = new DBHandler();

test('Get all images from portfolio_images table', async () => {
  const allImgsResult = await dbHandler.getAllImgs();
  expect(allImgsResult).toBeInstanceOf(Object);
});

test('Add and delete a tag from the portfolio_tags table', async () => {
  const tagName = 'dbHandler-test-tag';
  let tagsInDB = await dbHandler.getAllTagNames();

  // Prep for testing 
  // Delete tag if it exists
  if (tagsInDB.includes(tagName)) {
    // Attempt to delete the tag
    await dbHandler.removeTagFromDB(tagName);
    // Verify it does not exist
    tagsInDB = await dbHandler.getAllTagNames();
    expect(tagsInDB.includes(tagName)).toBe(false);
  }

  // Conduct Testing
  // Add tag to table
  const addTagResult = await dbHandler.addTagToDB(tagName);
  expect(typeof(addTagResult)).toBe('boolean');
  expect(addTagResult).toBe(true);
  // Verify the tag exists now
  tagsInDB = await dbHandler.getAllTagNames();
  expect(tagsInDB.includes(tagName)).toBe(true);

  // Cleanup
  // Delete tag if it exists
  const removeTagResult = await dbHandler.removeTagFromDB(tagName);
  expect(typeof(removeTagResult)).toBe('boolean');
  expect(removeTagResult).toBe(true);
  // Verify it does not exist
  tagsInDB = await dbHandler.getAllTagNames();
  expect(tagsInDB.includes(tagName)).toBe(false);

});


// test('Add and remove a test tag from portfolio_tags table', () => {

//   // Verify that the tag exists
//     // If tag already exist
//       // Return error

//     // If tag doesn't exist
//       // Add the tag
//       // Verify that it now exists
//         // If it exists
//           // Delete it for cleanup
//         // If it doesn't exist
//           // Return error
// });
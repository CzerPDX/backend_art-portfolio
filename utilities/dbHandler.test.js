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

test('Add and remove a tag from portfolio_tags table'), async () => {
  // Prep for testing
    // If tag exists, remove it

  // Begin test
  // Add tag
    // Verify the tag does not yet exist
    // Add it
    // Check that it exists
  // Remove tag
    // Remove the tag
    // Verify it no longer exists
};

test('Add and remove an image from portfolio_images table'), async () => {
  // Prep for testing
    // If image exists, remove it

  // Begin test
  // Add image
    // Verify the image does not yet exist
    // Add it
    // Check that it exists
  // Remove image
    // Remove the image
    // Verify it no longer exists
};

test('Add and remove an association from portfolio_image_tags_assoc table'), async () => {
  // Prep for testing
    // If test tag does not exist, add it
    // If test image does not exist, add it
    // If assoc exists, remove it

  // Begin test
  // Add assoc
    // Verify the assoc does not yet exist
    // Add it
    // Check that it exists
  // Remove assoc
    // Remove the assoc
    // Verify it no longer exists

  // Cleanup test
    // Remove test tag
    // Remove test image
};



// test('Add and delete an image from the portfolio_image table', async () => {
  


//   // Prep for testing 
//   // Delete tag if it exists
//   let tagsInDB = await dbHandler.getAllTagNames();
//   if (tagsInDB.includes(tagName)) {
//     // Attempt to delete the tag
//     await dbHandler.removeTagFromDB(tagName);
//     // Verify it no longer exists
//     tagsInDB = await dbHandler.getAllTagNames();
//     expect(tagsInDB.includes(tagName)).toBe(false);
//   }
//   // Delete Image if it exists
//   // Delete association if it exists
  

//   // Conduct Testing
//   // Add tag to table
//   const addTagResult = await dbHandler.addTagToDB(tagName);
//   expect(typeof(addTagResult)).toBe('boolean');
//   expect(addTagResult).toBe(true);
//   // Verify the tag exists now
//   tagsInDB = await dbHandler.getAllTagNames();
//   expect(tagsInDB.includes(tagName)).toBe(true);

//   // Add image to datbaase
//     // First, verify the filename doesn't exist
//     // let filenamesInDB = await dbHandler.getAllFilenames();
//     // if (tagsInDB.includes(filename)) {
//       // Attempt to delete the filename row
//       // await dbHandler.removeImageFromDB(filename);
//       // Verify it no longer exists
//       // filenamesInDB = await dbHandler.getAllFilenames();
//       // expect(filenamesInDB.includes(filename)).toBe(false);
//     // }
//     // Add the file to the database
//     let addImageResult = await dbHandler.addImgToDB(filename, bucketUrl, description, altText, tags);
//     expect(addImageResult).toBe(true);
//     // Verify it does exist
//     filenamesInDB = await dbHandler.getAllFilenames();
//     expect(filenamesInDB.includes(filename)).toBe(true);

//   // Add an association between tag and image
//     // Verify the tag and image aren't on the assoc table
//     // Associate them
//     // Verify they are associated

  
//   // Cleanup
//   // Delete association if it exists
//   // Delete image if it exists
//   // Delete tag if it exists
//   const removeTagResult = await dbHandler.removeTagFromDB(tagName);
//   expect(typeof(removeTagResult)).toBe('boolean');
//   expect(removeTagResult).toBe(true);
//   // Verify it does not exist
//   tagsInDB = await dbHandler.getAllTagNames();
//   expect(tagsInDB.includes(tagName)).toBe(false);

// });



// // Close out the dbHandler after it's done being used
// dbHandler.cleanupHandler();
// https://jestjs.io/docs/getting-started

const dbHandler = require('./dbHandler');
require('dotenv').config();

test('Add an image to the databas', async () => {
  const allImgsResult = await dbHandler.getAllImgs();
  expect(allImgsResult).toBeInstanceOf(Object);
});

test('Add and delete a tag from the portfolio_tags table', async () => {
  const tagName = 'dbHandler-test-tag';
  const filename = 'a-test-filename.jpg';
  const bucketUrl = 'atestbucketur.com';
  const description = 'descriptive test description';
  const altText = 'alt text alternatively textual';
  const tags = [tagName, 'illustration'];


  // Prep for testing 
  // Delete tag if it exists
  let tagsInDB = await dbHandler.getAllTagNames();
  if (tagsInDB.includes(tagName)) {
    // Attempt to delete the tag
    await dbHandler.removeTagFromDB(tagName);
    // Verify it no longer exists
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

  // Add image to datbaase
    // First, verify the filename doesn't exist
    // let filenamesInDB = await dbHandler.getAllFilenames();
    // if (tagsInDB.includes(filename)) {
      // Attempt to delete the filename row
      // await dbHandler.removeImageFromDB(filename);
      // Verify it no longer exists
      // filenamesInDB = await dbHandler.getAllFilenames();
      // expect(filenamesInDB.includes(filename)).toBe(false);
    // }
    // Add the file to the database
    let addImageResult = await dbHandler.addImgToDB(filename, bucketUrl, description, altText, tags);
    expect(addImageResult).toBe(true);
    // Verify it does exist
    filenamesInDB = await dbHandler.getAllFilenames();
    expect(filenamesInDB.includes(filename)).toBe(true);

  // Add an association between tag and image
    // Verify the tag and image aren't on the assoc table
    // Associate them
    // Verify they are associated

  
  // Cleanup
  // Delete association if it exists
  // Delete image if it exists
  // Delete tag if it exists
  const removeTagResult = await dbHandler.removeTagFromDB(tagName);
  expect(typeof(removeTagResult)).toBe('boolean');
  expect(removeTagResult).toBe(true);
  // Verify it does not exist
  tagsInDB = await dbHandler.getAllTagNames();
  expect(tagsInDB.includes(tagName)).toBe(false);

});



// Close out the dbHandler after it's done being used
dbHandler.cleanupHandler();
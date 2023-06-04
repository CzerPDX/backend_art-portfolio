# backend-portlandredbird-v2
In-progress. A `Node.js` backend for the art portfolio at portlandredbird.com. Offers authorized access to backend services for use by frontend and admin tool clients.

## Website Routes
A user must be authorized with an API key in the `x-api-key` field of the request header in order to use these routes.
### /artRoutes
Serves information about the art in the portfolio. The frontend can call these routes and get the following information about an image:
- Image URL
- Description
- Alt Text

### /upload
Authorized users can upload images to the file bucket and the details to the `PostgreSQL` database. Must include a description and alt text in the request.

Current iteration of the software overwrites images of the same name, but future iterations will provide response interface that allows the frontend to change the name or overwrite depending.

### /delete
Authorized users can delete images from the 


## Art Portfolio Database Structure
The art portfolio website uses a PostgreSQL database to store information about images and their associated tags. The database has three tables: `portfolio_images`, `portfolio_tags`, and `portfolio_image_tags_assoc`.

### Tables
#### `portfolio_images`: Stores information about each image in the portfolio.

- `filename` (TEXT, PRIMARY KEY): The filename where the image is stored.
- `description` (TEXT): A brief description of the image.
- `alt_text` (TEXT): The alt text for the image, used for accessibility.
- `bucket_url` (TEXT): The url for the location of the image (does not include filename)

#### `portfolio_tags`: Stores the unique tags used to categorize images in the portfolio.

- `tag_id` (SERIAL, PRIMARY KEY): A unique identifier for each tag.
- `tag_name` (TEXT, UNIQUE): The name of the tag.

#### `portfolio_image_tags_assoc`: Association table that maps the relationships between images and their associated tags.

- `filename` (TEXT, FOREIGN KEY referencing `portfolio_images.filename`): The url location of the image.
- `tag_id` (INTEGER, FOREIGN KEY referencing `portfolio_tags.tag_id`): The unique identifier of the tag.
PRIMARY KEY (filename, tag_id)

This database structure creates a many-to-many relationship between images and tags, allowing each image to have multiple tags and each tag to be associated with multiple images. The image_tags table serves as a junction table that links images and tags, enabling efficient querying and management of the relationships between them.


# To Do
[ ] - Query to get portfolio_image rows that do not have a filename listing in the assoc table. (orphans that will not show up on the site. Want to leave them in because it might be better for the user to be able to upload images and then associate them to tags later.)
[ ] - Not currently utilizing connection pool correctly. Right now I create a new pool every time I make a query. This is temporary functionality and needs to be updated so that the DBHandler object creates the pool when it's constructed and it persists, but will need to think about how that means it should be used. Each route really only needs to make one query, so I will need to read about the best way to restructure the usage of DBHandler in the client so it can make use of a persistent pool (if possible with this structure).
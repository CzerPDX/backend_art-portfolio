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
Authorized users can upload images to the `PostgreSQL` database. Must include a description and alt text in the request.

Current iteration of the software overwrites images of the same name, but future iterations will provide response interface that allows the frontend to change the name or overwrite depending.

## Art Portfolio Database Structure
The art portfolio website uses a PostgreSQL database to store information about images and their associated tags. The database has three tables: `portfolio_images`, `portfolio_tags`, and `portfolio_image_tags_assoc`.

### Tables
#### `portfolio_images`: Stores information about each image in the portfolio.

- `filename` (TEXT, PRIMARY KEY): The unique filename of the image.
- `description` (TEXT): A brief description of the image.
- `alt_text` (TEXT): The alternative text for the image, used for accessibility purposes.

#### `portfolio_tags`: Stores the unique tags used to categorize images in the portfolio.

- `tag_id` (SERIAL, PRIMARY KEY): A unique identifier for each tag.
- `tag_name` (TEXT, UNIQUE): The name of the tag.

#### `portfolio_image_tags_assoc`: Association table that maps the relationships between images and their associated tags.

- `filename` (TEXT, FOREIGN KEY referencing `portfolio_images.filename`): The filename of the image.
- `tag_id` (INTEGER, FOREIGN KEY referencing `portfolio_tags.tag_id`): The unique identifier of the tag.
PRIMARY KEY (filename, tag_id)

This database structure creates a many-to-many relationship between images and tags, allowing each image to have multiple tags and each tag to be associated with multiple images. The image_tags table serves as a junction table that links images and tags, enabling efficient querying and management of the relationships between them.

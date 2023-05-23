# backend-portlandredbird-v2
New backend for portlandredbird.com. Runs on Node.js. Offers authorized access to backend services for frontend and admin tools.

# Content Delivery Network (CDN)
Cloudflare Integration: this project uses Cloudflare for improved performance, security, and reliability.

## Main Routes

### Art Portfolio
Get information about images in the portfolio.

### Upload Images
Authorized users can upload images to the database.

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

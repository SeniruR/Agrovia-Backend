// When handling crop post creation or update:
let minBulk = req.body.minimum_quantity_bulk;
if (minBulk === '' || minBulk === undefined || minBulk === null) {
  minBulk = null;
} else if (!isNaN(minBulk)) {
  minBulk = Number(minBulk);
}
// Use minBulk when saving to the database
// Example:
// cropPost.minimum_quantity_bulk = minBulk;
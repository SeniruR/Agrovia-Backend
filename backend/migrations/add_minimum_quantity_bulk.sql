-- Migration to add minimum_quantity_bulk column to crop_posts table
-- This adds support for minimum bulk order quantities

ALTER TABLE crop_posts 
ADD COLUMN minimum_quantity_bulk DECIMAL(10,2) DEFAULT NULL AFTER price_per_unit;

-- Add a comment to describe the column
ALTER TABLE crop_posts 
MODIFY COLUMN minimum_quantity_bulk DECIMAL(10,2) DEFAULT NULL COMMENT 'Minimum quantity required for bulk orders';

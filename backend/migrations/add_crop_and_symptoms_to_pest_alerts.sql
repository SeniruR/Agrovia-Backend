-- Migration: Add crop and symptoms columns to pest_alerts table
ALTER TABLE pest_alerts
ADD COLUMN crop VARCHAR(255) AFTER description,
ADD COLUMN symptoms VARCHAR(255) AFTER crop;

-- Database: customer_feedback
-- Schema: feedback

CREATE SCHEMA IF NOT EXISTS feedback;

-- Table: feedback.complaints
-- This is the unified table for all customer feedback across all sources.

CREATE TABLE IF NOT EXISTS feedback.complaints (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255),
    product_category VARCHAR(255),
    complaint_text TEXT,
    complaint_category VARCHAR(255),
    sentiment VARCHAR(50), -- Positive, Neutral, Negative
    sentiment_score NUMERIC(5,2), -- The numerical score from processing
    source VARCHAR(100), -- Instagram, Amazon, Nykaa, CallCenter, etc.
    customer_name VARCHAR(255),
    customer_contact VARCHAR(255),
    date TIMESTAMP, -- Date extracted from file
    order_id VARCHAR(100),
    embedding JSONB, -- Storing embedding as JSONB for flexibilty (pgvector compatible)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Record creation time
);

-- Index for faster analytics lookups
CREATE INDEX IF NOT EXISTS idx_complaints_category ON feedback.complaints(complaint_category);
CREATE INDEX IF NOT EXISTS idx_complaints_sentiment ON feedback.complaints(sentiment);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON feedback.complaints(date);
CREATE INDEX IF NOT EXISTS idx_complaints_product ON feedback.complaints(product_name);

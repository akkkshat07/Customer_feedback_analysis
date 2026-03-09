-- Database: customer_feedback
-- Table: complaints

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255),
    product_category VARCHAR(255),
    complaint_text TEXT,
    complaint_category VARCHAR(255),
    sentiment VARCHAR(50), -- Positive, Neutral, Negative
    sentiment_score NUMERIC(5,2), -- The numerical score from processing
    source VARCHAR(100), -- Instagram, Amazon, CallCenter, etc.
    customer_name VARCHAR(255),
    customer_contact VARCHAR(255),
    date TIMESTAMP, -- Date extracted from file
    order_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Record creation time
);

-- Index for faster analytics lookups
CREATE INDEX idx_complaints_category ON complaints(complaint_category);
CREATE INDEX idx_complaints_sentiment ON complaints(sentiment);
CREATE INDEX idx_complaints_date ON complaints(date);

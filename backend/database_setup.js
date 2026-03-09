const db = require('./db');

const setupDatabase = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(255),
            product_category VARCHAR(255),
            complaint_text TEXT,
            complaint_category VARCHAR(255),
            sentiment VARCHAR(50),
            sentiment_score NUMERIC(5,2),
            source VARCHAR(100),
            customer_name VARCHAR(255),
            customer_contact VARCHAR(255),
            date TIMESTAMP,
            order_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await db.query(createTableQuery);
        console.log("Table 'complaints' created or already exists.");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        process.exit();
    }
};

setupDatabase();

const db = require('./db');
const fs = require('fs');
const path = require('path');

const setupDatabase = async () => {
    console.log("Starting database setup...");
    
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema script
        await db.query(schemaSql);
        console.log("Database schema applied successfully.");
        
        // Check if we have pgvector extension (optional but good for embeddings)
        try {
            await db.query('CREATE EXTENSION IF NOT EXISTS vector');
            console.log("pgvector extension enabled.");
            
            // Alter table to use vector type if extension is present
            await db.query('ALTER TABLE feedback.complaints ALTER COLUMN embedding TYPE vector(768) USING embedding::vector(768)');
            console.log("Converted embedding column to vector(768) type.");
        } catch (vErr) {
            console.log("pgvector extension not found or could not be enabled. Keeping embedding as JSONB.");
        }

    } catch (err) {
        console.error("Error during database setup:", err);
    } finally {
        process.exit();
    }
};

setupDatabase();

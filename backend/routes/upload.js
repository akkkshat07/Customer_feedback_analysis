const express = require('express');
const multer = require('multer');
const { processFile } = require('../services/processData');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Only .csv and .xlsx formats are allowed'), false);
        }
    }
});

router.post('/', upload.array('files', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or invalid format.' });
        }

        const source = req.body.source || 'Unknown'; // Default source if none provided in body
        let totalSummary = { TotalReceived: 0, Ingested: 0, Ignored: 0, BySource: {}, BySentiment: {} };

        for (const file of req.files) {
            const result = await processFile(file.path, file.originalname, source);
            totalSummary.TotalReceived += result.TotalReceived;
            totalSummary.Ingested += result.Ingested;
            totalSummary.Ignored += result.Ignored;

            for (const [key, value] of Object.entries(result.BySource)) {
                totalSummary.BySource[key] = (totalSummary.BySource[key] || 0) + value;
            }
            for (const [key, value] of Object.entries(result.BySentiment)) {
                totalSummary.BySentiment[key] = (totalSummary.BySentiment[key] || 0) + value;
            }
        }

        res.json({ message: 'Files processed successfully', summary: totalSummary });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to process files: ' + error.message });
    }
});

module.exports = router;

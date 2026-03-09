const fs = require('fs');
const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const Sentiment = require('sentiment');
const crypto = require('crypto');
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

const getEmbedding = async (text) => {
    const result = await embeddingModel.embedContent(String(text));
    return result.embedding.values;
};

const sentimentAnalyzer = new Sentiment();

const categorizeComplaint = (text = '') => {
    const lowerText = String(text).toLowerCase();

    if (lowerText.match(/packag|box|wrapper|seal|blister|cap|container|bottle|tube|pump|leak|spray|short pack|theft/)) return 'Packaging Issue';
    if (lowerText.match(/rash|itch|swell|allergy|reaction|burn|pimple|acne/)) return 'Health/Allergy Issue';
    if (lowerText.match(/counterfeit|fake|duplicate|original|not matching/)) return 'Counterfeit Concern';
    if (lowerText.match(/staying|flowing|bad|not working|result|effect|useless|waste|spread/)) return 'Product Performance';
    if (lowerText.match(/qualit|cheap|break|broken|torn|material|mechanism|fittment|pin hole|dry|sticky|defect|ink/)) return 'Product Quality';
    if (lowerText.match(/smell|odor|fragrance|stink/)) return 'Smell Issue';
    if (lowerText.match(/damage|shatter|crush/)) return 'Damaged Product';
    if (lowerText.match(/late|delay|wait|never arrived/)) return 'Late Delivery';
    if (lowerText.match(/wrong|incorrect|different|missing/)) return 'Wrong Item';
    if (lowerText.match(/print|coding|mrp|label|expiry/)) return 'Printing & Labeling';
    if (lowerText.match(/rude|support|service|salesman/)) return 'Customer Service';

    return 'Other';
};

const normalizeRow = (row, source) => {
    const getField = (keys) => {
        for (const key of keys) {
            const foundKey = Object.keys(row).find(k => k.toLowerCase().includes(key));
            if (foundKey && row[foundKey]) return row[foundKey];
        }
        return null;
    };

    const productName = getField(['product', 'item', 'brand', 'article']) || 'Unknown Product';
    const productCategory = getField(['category', 'type', 'group', 'class']) || 'Unknown Category';

    let complaintText = getField(['complaint', 'review', 'issue', 'description', 'feedback', 'message', 'text', 'comment', 'query', 'reason', 'remark', 'chat', 'transcript', 'body', 'content', 'detail', 'msg']);

    // Smart fallback: If we couldn't find a named column, the complaint is almost always the longest string in the row!
    if (!complaintText) {
        let longestText = '';
        for (const [key, value] of Object.entries(row)) {
            if (key !== '_sheetName' && typeof value === 'string') {
                if (value.length > longestText.length) {
                    longestText = value;
                }
            }
        }
        if (longestText.length > 10) {
            complaintText = longestText;
        }
    }
    complaintText = complaintText || '';

    const customerName = getField(['name', 'customer', 'user', 'client']) || 'Unknown';
    const customerContact = getField(['email', 'phone', 'contact', 'mobile']) || '';
    const dateVal = getField(['date', 'time', 'created']);
    let date = new Date();
    if (dateVal && !isNaN(new Date(dateVal))) { date = new Date(dateVal); }
    const orderId = getField(['order', 'id', 'ticket']) || '';

    let finalSource = row.source || source;
    if (row._sheetName) {
        const lowerSheet = row._sheetName.toLowerCase();
        if (lowerSheet.includes('whatsapp') || lowerSheet.includes('insta') || lowerSheet.includes('fb') || lowerSheet.includes('social')) {
            finalSource = 'Social Media';
        } else if (lowerSheet.includes('ecom') || lowerSheet.includes('amazon') || lowerSheet.includes('flipkart') || lowerSheet.includes('nykaa')) {
            finalSource = 'E-commerce Portals';
        } else if (lowerSheet.includes('care') || lowerSheet.includes('support') || lowerSheet.includes('call')) {
            finalSource = 'Customer Care';
        } else {
            finalSource = row._sheetName;
        }
    }

    return {
        productName,
        productCategory,
        complaintText,
        customerName,
        customerContact,
        date,
        orderId,
        source: finalSource
    };
};

const processFile = async (filePath, originalName, defaultSource) => {
    let rawData = [];

    const lowerName = originalName.toLowerCase();
    if (lowerName.endsWith('.csv')) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        rawData = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const workbook = xlsx.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            // Tag each row with its source sheet name
            sheetData.forEach(row => row._sheetName = sheetName);
            rawData = rawData.concat(sheetData);
        }
    }

    let summary = { TotalReceived: rawData.length, Ingested: 0, Ignored: 0, BySource: {}, BySentiment: {} };

    // Fetch existing records to prevent duplicates
    let existingHashSet = new Set();
    try {
        const existingData = await db.query(`
            SELECT MD5(CONCAT(complaint_text, product_name)) as hash 
            FROM complaints 
            WHERE complaint_text IS NOT NULL
        `);
        existingData.rows.forEach(r => existingHashSet.add(r.hash));
    } catch (err) {
        console.error("Failed to load existing hashes for deduping", err);
    }

    for (const row of rawData) {
        const normalized = normalizeRow(row, defaultSource);

        if (!normalized.complaintText) {
            summary.Ignored++;
            continue;
        }

        const hashStr = String(normalized.complaintText) + String(normalized.productName);
        const rowHash = crypto.createHash('md5').update(hashStr).digest('hex');

        if (existingHashSet.has(rowHash)) {
            summary.Ignored++;
            continue;
        }

        const category = categorizeComplaint(normalized.complaintText);

        const sentimentResult = sentimentAnalyzer.analyze(String(normalized.complaintText));
        const sentimentScore = sentimentResult.score;
        let sentimentLabel = 'Neutral';
        if (sentimentScore > 0) sentimentLabel = 'Positive';
        else if (sentimentScore < 0) sentimentLabel = 'Negative';

        let embeddingVector = null;
        try {
            embeddingVector = await getEmbedding(normalized.complaintText);
        } catch (err) {
            console.error("Embedding generation failed:", err.message);
        }

        const query = `
            INSERT INTO complaints 
            (product_name, product_category, complaint_text, complaint_category, sentiment, sentiment_score, source, customer_name, customer_contact, date, order_id, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;

        // pgvector expects the vector as a string: '[1.1, 2.2, ...]'
        const embeddingString = embeddingVector ? JSON.stringify(embeddingVector) : null;

        const values = [
            normalized.productName,
            normalized.productCategory,
            normalized.complaintText,
            category,
            sentimentLabel,
            sentimentScore,
            normalized.source,
            normalized.customerName,
            normalized.customerContact,
            normalized.date,
            normalized.orderId,
            embeddingString
        ];

        try {
            await db.query(query, values);
            summary.Ingested++;
            summary.BySource[normalized.source] = (summary.BySource[normalized.source] || 0) + 1;
            summary.BySentiment[sentimentLabel] = (summary.BySentiment[sentimentLabel] || 0) + 1;
        } catch (err) {
            console.error("Error inserting row", err);
            summary.Ignored++;
        }
    }

    fs.unlinkSync(filePath);

    return summary;
};

module.exports = { processFile, categorizeComplaint };

const fs = require('fs');
const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const Sentiment = require('sentiment');
const crypto = require('crypto');
const db = require('../db');
require('dotenv').config();

const sentimentAnalyzer = new Sentiment();

// ── Complaint categorizer ──────────────────────────────────────────────────
const categorizeComplaint = (text = '') => {
    const t = String(text).toLowerCase();
    if (t.match(/packag|box|wrapper|seal|blister|cap|container|bottle|tube|pump|leak|spray|short pack|theft/)) return 'Packaging Issue';
    if (t.match(/rash|itch|swell|allergy|reaction|burn|pimple|acne/)) return 'Health/Allergy Issue';
    if (t.match(/counterfeit|fake|duplicate|original|not matching/)) return 'Counterfeit Concern';
    if (t.match(/staying|flowing|bad|not working|result|effect|useless|waste|spread/)) return 'Product Performance';
    if (t.match(/qualit|cheap|break|broken|torn|material|mechanism|fittment|pin hole|dry|sticky|defect|ink/)) return 'Product Quality';
    if (t.match(/smell|odor|fragrance|stink/)) return 'Smell Issue';
    if (t.match(/damage|shatter|crush/)) return 'Damaged Product';
    if (t.match(/late|delay|wait|never arrived/)) return 'Late Delivery';
    if (t.match(/wrong|incorrect|different|missing/)) return 'Wrong Item';
    if (t.match(/print|coding|mrp|label|expiry/)) return 'Printing & Labeling';
    if (t.match(/rude|support|service|salesman/)) return 'Customer Service';
    return 'Other';
};

// ── Detect platform from sheet name or review text ────────────────────────
const PLATFORM_PATTERNS = [
    ['Amazon',    /amazon/],
    ['Nykaa',     /nykaa/],
    ['Flipkart',  /flipkart/],
    ['Myntra',    /myntra/],
    ['Meesho',    /meesho/],
    ['YouTube',   /youtube/],
    ['Instagram', /instagram|insta\b/],
    ['WhatsApp',  /whatsapp/],
    ['Facebook',  /facebook|\bfb\b/],
    ['Twitter/X', /twitter|x\.com/],
    ['Snapdeal',  /snapdeal/],
    ['JioMart',   /jiomart/],
    ['Purplle',   /purplle/],
];

const detectPlatformName = (reviewText = '', sheetName = '') => {
    const combined = (sheetName + ' ' + reviewText).toLowerCase();
    for (const [name, pattern] of PLATFORM_PATTERNS) {
        if (pattern.test(combined)) return name;
    }
    return null; // Will default to E-commerce
};

// ── Find-or-create helpers (with in-memory cache) ─────────────────────────
const getOrCreateBrand = async (brandName, cache) => {
    if (cache.has(brandName)) return cache.get(brandName);
    let res = await db.query('SELECT brand_id FROM feedback.brands WHERE brand_name = $1', [brandName]);
    if (res.rows.length === 0) {
        res = await db.query('INSERT INTO feedback.brands (brand_name) VALUES ($1) RETURNING brand_id', [brandName]);
    }
    const id = res.rows[0].brand_id;
    cache.set(brandName, id);
    return id;
};

const getOrCreateProduct = async (productName, brandId, cache) => {
    const key = `${productName}::${brandId}`;
    if (cache.has(key)) return cache.get(key);
    let res = await db.query('SELECT product_id FROM feedback.products WHERE product_name = $1 AND brand_id = $2', [productName, brandId]);
    if (res.rows.length === 0) {
        res = await db.query('INSERT INTO feedback.products (product_name, brand_id) VALUES ($1, $2) RETURNING product_id', [productName, brandId]);
    }
    const id = res.rows[0].product_id;
    cache.set(key, id);
    return id;
};

const getOrCreatePlatform = async (platformName, cache) => {
    if (cache.has(platformName)) return cache.get(platformName);
    let res = await db.query('SELECT platform_id FROM feedback.platforms WHERE platform_name = $1', [platformName]);
    if (res.rows.length === 0) {
        res = await db.query('INSERT INTO feedback.platforms (platform_name) VALUES ($1) RETURNING platform_id', [platformName]);
    }
    const id = res.rows[0].platform_id;
    cache.set(platformName, id);
    return id;
};

// ── Row normalizer ─────────────────────────────────────────────────────────
const normalizeRow = (row, defaultSource) => {
    const getField = (keys) => {
        for (const key of keys) {
            const found = Object.keys(row).find(k => k.toLowerCase().includes(key));
            if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return String(row[found]);
        }
        return null;
    };

    const productName = getField(['product', 'item', 'article']) || 'Unknown Product';
    const brandName   = getField(['brand', 'company', 'manufacturer']) || defaultSource || 'Unknown Brand';
    const reviewTitle = getField(['title', 'subject', 'heading']) || '';

    let reviewText = getField(['complaint', 'review', 'issue', 'description', 'feedback', 'message',
                               'text', 'comment', 'query', 'reason', 'remark', 'chat', 'transcript',
                               'body', 'content', 'detail', 'msg']);
    // Fallback: use the longest string field
    if (!reviewText) {
        let longest = '';
        for (const [key, value] of Object.entries(row)) {
            if (key !== '_sheetName' && typeof value === 'string' && value.length > longest.length) {
                longest = value;
            }
        }
        if (longest.length > 10) reviewText = longest;
    }
    reviewText = reviewText || '';

    const customerName = getField(['name', 'customer', 'user', 'client']) || 'Unknown';
    const dateVal = getField(['date', 'time', 'created', 'posted']);
    let date = null;
    if (dateVal && !isNaN(new Date(dateVal))) date = new Date(dateVal);

    // Determine platform from sheet name
    const sheetName = row._sheetName || '';

    return { productName, brandName, reviewTitle, reviewText, customerName, date, sheetName };
};

// ── Dedup hash: based on review text + product name + customer + date ──────
const makeHash = (reviewText, productName, customerName, date) => {
    const str = [
        String(reviewText).trim().toLowerCase(),
        String(productName).trim().toLowerCase(),
        String(customerName).trim().toLowerCase(),
        date ? new Date(date).toISOString().slice(0, 10) : '',
    ].join('||');
    return crypto.createHash('md5').update(str).digest('hex');
};

// ── Main processor ─────────────────────────────────────────────────────────
const processFile = async (filePath, originalName, defaultSource) => {
    let rawData = [];

    const lowerName = originalName.toLowerCase();
    if (lowerName.endsWith('.csv')) {
        const content = fs.readFileSync(filePath, 'utf8');
        rawData = parse(content, { columns: true, skip_empty_lines: true });
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const workbook = xlsx.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            rows.forEach(r => r._sheetName = sheetName);
            rawData = rawData.concat(rows);
        }
    }

    const summary = { TotalReceived: rawData.length, Ingested: 0, Duplicates: 0, Ignored: 0, BySource: {}, BySentiment: {} };

    // Pre-load all existing dedup hashes from feedback.reviews
    const existingHashes = new Set();
    try {
        const res = await db.query(`
            SELECT MD5(CONCAT(
                LOWER(TRIM(COALESCE(r.review_detail,''))), '||',
                LOWER(TRIM(COALESCE(p.product_name,''))), '||',
                LOWER(TRIM(COALESCE(r.customer_name,''))), '||',
                COALESCE(r.comment_date::date::text, '')
            )) AS hash
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
        `);
        res.rows.forEach(r => existingHashes.add(r.hash));
        console.log(`Loaded ${existingHashes.size} existing review hashes for deduplication`);
    } catch (err) {
        console.error('Failed to load existing hashes:', err.message);
    }

    // In-memory caches for brand/product/platform lookups
    const brandCache    = new Map();
    const productCache  = new Map();
    const platformCache = new Map();

    // Pre-load E-commerce platform id (default)
    const ecomPlatformId = await getOrCreatePlatform('E-commerce', platformCache);

    let rowIndex = 0;
    for (const row of rawData) {
        rowIndex++;
        const n = normalizeRow(row, defaultSource);

        if (!n.reviewText) {
            summary.Ignored++;
            continue;
        }

        // Dedup check BEFORE any DB lookups
        const hash = makeHash(n.reviewText, n.productName, n.customerName, n.date);
        if (existingHashes.has(hash)) {
            summary.Duplicates++;
            continue;
        }

        // Sentiment analysis
        const sentimentResult = sentimentAnalyzer.analyze(n.reviewText);
        let sentimentLabel = 'Neutral';
        if (sentimentResult.score > 0) sentimentLabel = 'Positive';
        else if (sentimentResult.score < 0) sentimentLabel = 'Negative';

        // Category
        const category = categorizeComplaint(n.reviewText);

        // Platform detection
        const platformName = detectPlatformName(n.reviewText, n.sheetName);
        const platformId = platformName
            ? await getOrCreatePlatform(platformName, platformCache)
            : ecomPlatformId;

        // Brand and product lookup/create
        const brandId   = await getOrCreateBrand(n.brandName, brandCache);
        const productId = await getOrCreateProduct(n.productName, brandId, productCache);

        try {
            await db.query(`
                INSERT INTO feedback.reviews
                    (review_number, platform_id, product_id, brand_id,
                     comment_date, review_title, review_detail,
                     customer_name, comment_category, sentiment,
                     source_sheet, source_file, inserted_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
            `, [
                rowIndex,
                platformId,
                productId,
                brandId,
                n.date,
                n.reviewTitle || null,
                n.reviewText,
                n.customerName,
                category,
                sentimentLabel,
                n.sheetName || 'Uploaded',
                originalName,
            ]);

            // Mark as seen so same file can't self-duplicate
            existingHashes.add(hash);

            summary.Ingested++;
            const src = platformName || 'E-commerce';
            summary.BySource[src]       = (summary.BySource[src] || 0) + 1;
            summary.BySentiment[sentimentLabel] = (summary.BySentiment[sentimentLabel] || 0) + 1;
        } catch (err) {
            console.error('Error inserting review row:', err.message);
            summary.Ignored++;
        }
    }

    fs.unlinkSync(filePath);
    return summary;
};

module.exports = { processFile, categorizeComplaint };

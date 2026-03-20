const express = require('express');
const db = require('../db');

const router = express.Router();

// Shared SQL snippet: normalize raw comment_category into clean groups
const CAT_NORMALIZE = (col) => `
    CASE
        WHEN LOWER(${col}) LIKE '%quality%' THEN 'Quality'
        WHEN LOWER(${col}) LIKE '%packag%' OR LOWER(${col}) IN ('seal broken','blank bottle') THEN 'Packaging'
        WHEN LOWER(${col}) LIKE '%price%' OR LOWER(${col}) IN ('affordable price','money') THEN 'Price'
        WHEN LOWER(${col}) LIKE '%damage%' OR LOWER(${col}) LIKE '%broken%' OR LOWER(${col}) IN ('broken','expired product','used product','wrong content','wrong product') THEN 'Damage / Defective'
        WHEN LOWER(${col}) LIKE '%deliver%' THEN 'Delivery'
        WHEN LOWER(${col}) LIKE '%manufactur%' THEN 'Manufacturing'
        WHEN LOWER(${col}) LIKE '%quant%' THEN 'Quantity'
        WHEN LOWER(${col}) LIKE '%shade%' OR LOWER(${col}) LIKE '%color%' OR LOWER(${col}) LIKE '%colour%' THEN 'Shade / Color'
        WHEN LOWER(${col}) LIKE '%buy%' OR LOWER(${col}) LIKE '%return%' OR LOWER(${col}) IN ('wasted purchase','bad','not smudge') THEN 'Dissatisfaction'
        ELSE INITCAP(TRIM(LOWER(${col})))
    END
`;

router.get('/dashboard-data', async (req, res) => {
    try {
        const totalRes = await db.query(`SELECT COUNT(*) FROM feedback.reviews`);
        const totalComplaints = parseInt(totalRes.rows[0].count);

        const categoryRes = await db.query(`
            SELECT 
                ${CAT_NORMALIZE('comment_category')} AS complaint_category,
                COUNT(*) AS count
            FROM feedback.reviews
            WHERE comment_category IS NOT NULL AND comment_category != ''
              AND comment_category NOT ILIKE '%not available%'
              AND comment_category NOT ILIKE '%review not available%'
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 8
        `);

        const productRes = await db.query(`
            SELECT p.product_name, COUNT(*) AS count
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name IS NOT NULL
            GROUP BY p.product_name
            ORDER BY count DESC
            LIMIT 10
        `);

        const sentimentRes = await db.query(`
            SELECT 
                CASE 
                    WHEN sentiment ILIKE '%Positive%' THEN 'Positive'
                    WHEN sentiment ILIKE '%Negative%' THEN 'Negative'
                    ELSE 'Neutral'
                END AS sentiment,
                COUNT(*) AS count
            FROM feedback.reviews
            WHERE sentiment IS NOT NULL AND sentiment != ''
              AND sentiment NOT ILIKE '%not available%'
            GROUP BY 1
        `);

        const trendRes = await db.query(`
            SELECT DATE_TRUNC('month', comment_date) AS day, COUNT(*) AS count
            FROM feedback.reviews
            WHERE comment_date IS NOT NULL
            GROUP BY day
            ORDER BY day DESC
            LIMIT 12
        `);

        const recurringRes = await db.query(`
            SELECT p.product_name, 
                ${CAT_NORMALIZE('r.comment_category')} AS complaint_category,
                COUNT(*) AS count
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name IS NOT NULL AND r.comment_category IS NOT NULL
              AND r.comment_category NOT ILIKE '%not available%'
              AND r.comment_category NOT ILIKE '%review not available%'
            GROUP BY p.product_name, 2
            ORDER BY count DESC
            LIMIT 5
        `);

        const recentRes = await db.query(`
            SELECT 
                p.product_name,
                r.comment_category AS complaint_category,
                CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 'Positive'
                    WHEN r.sentiment ILIKE '%Negative%' THEN 'Negative'
                    ELSE 'Neutral'
                END AS sentiment,
                r.comment_date AS date
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE r.review_detail IS NOT NULL AND r.review_detail != ''
            ORDER BY r.comment_date DESC
            LIMIT 50
        `);

        res.json({
            totalComplaints,
            complaintsByCategory: categoryRes.rows,
            complaintsByProduct: productRes.rows,
            sentimentDistribution: sentimentRes.rows,
            trendOverTime: trendRes.rows.reverse(),
            topRecurring: recurringRes.rows,
            recentComplaints: recentRes.rows
        });

    } catch (err) {
        console.error("Error fetching dashboard data", err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Yearly sentiment breakdown for dashboard drill-down chart
router.get('/yearly-sentiment', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                EXTRACT(YEAR FROM comment_date)::INT AS year,
                COUNT(*) AS total,
                COUNT(CASE WHEN sentiment ILIKE '%Positive%' THEN 1 END) AS positive,
                COUNT(CASE WHEN sentiment ILIKE '%Negative%' THEN 1 END) AS negative,
                COUNT(CASE WHEN sentiment NOT ILIKE '%Positive%' AND sentiment NOT ILIKE '%Negative%' THEN 1 END) AS neutral
            FROM feedback.reviews
            WHERE comment_date IS NOT NULL
            GROUP BY 1
            ORDER BY 1 ASC
        `);
        res.json(result.rows.map(r => ({
            year: r.year,
            total: parseInt(r.total),
            positive: parseInt(r.positive),
            negative: parseInt(r.negative),
            neutral: parseInt(r.neutral)
        })));
    } catch (err) {
        console.error('Error fetching yearly sentiment', err);
        res.status(500).json({ error: 'Failed to fetch yearly sentiment' });
    }
});

// Monthly sentiment breakdown for a given year
router.get('/monthly-sentiment', async (req, res) => {
    try {
        const year = parseInt(req.query.year);
        if (!year) return res.status(400).json({ error: 'year query param required' });

        const result = await db.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', comment_date), 'Mon') AS month,
                EXTRACT(MONTH FROM comment_date)::INT AS month_num,
                COUNT(*) AS total,
                COUNT(CASE WHEN sentiment ILIKE '%Positive%' THEN 1 END) AS positive,
                COUNT(CASE WHEN sentiment ILIKE '%Negative%' THEN 1 END) AS negative,
                COUNT(CASE WHEN sentiment NOT ILIKE '%Positive%' AND sentiment NOT ILIKE '%Negative%' THEN 1 END) AS neutral
            FROM feedback.reviews
            WHERE comment_date IS NOT NULL
              AND EXTRACT(YEAR FROM comment_date) = $1
            GROUP BY 1, 2
            ORDER BY 2 ASC
        `, [year]);
        res.json(result.rows.map(r => ({
            month: r.month,
            month_num: r.month_num,
            total: parseInt(r.total),
            positive: parseInt(r.positive),
            negative: parseInt(r.negative),
            neutral: parseInt(r.neutral)
        })));
    } catch (err) {
        console.error('Error fetching monthly sentiment', err);
        res.status(500).json({ error: 'Failed to fetch monthly sentiment' });
    }
});

router.get('/product-categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                b.brand_name AS product_category,
                COUNT(DISTINCT p.product_id) AS product_count,
                COUNT(r.review_id) AS total_feedback
            FROM feedback.brands b
            JOIN feedback.products p ON p.brand_id = b.brand_id
            LEFT JOIN feedback.reviews r ON r.product_id = p.product_id
            GROUP BY b.brand_name
            ORDER BY total_feedback DESC
        `);
        res.json(result.rows.map(r => ({
            ...r,
            product_count: parseInt(r.product_count),
            total_feedback: parseInt(r.total_feedback)
        })));
    } catch (err) {
        console.error("Error fetching product categories", err);
        res.status(500).json({ error: 'Failed to fetch product categories' });
    }
});

router.get('/products', async (req, res) => {
    try {
        const productStats = await db.query(`
            SELECT 
                p.product_name,
                b.brand_name AS product_category,
                COUNT(r.review_id) AS total_complaints,
                COUNT(CASE WHEN r.sentiment ILIKE '%Negative%' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN r.sentiment ILIKE '%Positive%' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN r.sentiment NOT ILIKE '%Negative%' AND r.sentiment NOT ILIKE '%Positive%' THEN 1 END) AS neutral_count,
                ROUND(AVG(CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 1
                    WHEN r.sentiment ILIKE '%Negative%' THEN -1
                    ELSE 0
                END)::NUMERIC, 2) AS avg_sentiment_score
            FROM feedback.products p
            JOIN feedback.brands b ON p.brand_id = b.brand_id
            LEFT JOIN feedback.reviews r ON r.product_id = p.product_id
            GROUP BY p.product_name, b.brand_name
            ORDER BY total_complaints DESC
        `);

        const topCategories = await db.query(`
            SELECT p.product_name, ranked.comment_category AS top_category
            FROM (
                SELECT product_id, comment_category, COUNT(*) AS cnt,
                       ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY COUNT(*) DESC) AS rn
                FROM feedback.reviews
                WHERE comment_category IS NOT NULL AND comment_category != ''
                  AND comment_category NOT ILIKE '%not available%'
                GROUP BY product_id, comment_category
            ) ranked
            JOIN feedback.products p ON p.product_id = ranked.product_id
            WHERE ranked.rn = 1
        `);

        const catMap = {};
        topCategories.rows.forEach(r => catMap[r.product_name] = r.top_category);

        const formatted = productStats.rows.map(r => ({
            ...r,
            total_complaints: parseInt(r.total_complaints),
            negative_count: parseInt(r.negative_count),
            positive_count: parseInt(r.positive_count),
            neutral_count: parseInt(r.neutral_count),
            avg_sentiment_score: parseFloat(r.avg_sentiment_score) || 0,
            top_category: catMap[r.product_name] || 'N/A'
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Error fetching products", err);
        res.status(500).json({ error: 'Failed to fetch product data' });
    }
});

router.get('/products/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const sentimentFilter = req.query.sentiment || null;
        const categoryFilter = req.query.category || null;

        const summaryRes = await db.query(`
            SELECT 
                COUNT(r.review_id) AS total,
                COUNT(CASE WHEN r.sentiment ILIKE '%Positive%' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN r.sentiment ILIKE '%Negative%' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN r.sentiment NOT ILIKE '%Positive%' AND r.sentiment NOT ILIKE '%Negative%' THEN 1 END) AS neutral_count,
                ROUND(AVG(CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 1
                    WHEN r.sentiment ILIKE '%Negative%' THEN -1
                    ELSE 0
                END)::NUMERIC, 2) AS avg_score,
                -1 AS min_score,
                1 AS max_score,
                MAX(b.brand_name) AS product_category
            FROM feedback.products p
            JOIN feedback.brands b ON p.brand_id = b.brand_id
            LEFT JOIN feedback.reviews r ON r.product_id = p.product_id
            WHERE p.product_name = $1
        `, [productName]);

        const categoryRes = await db.query(`
            SELECT 
                ${CAT_NORMALIZE('r.comment_category')} AS complaint_category,
                COUNT(*) AS count
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name = $1
              AND r.comment_category IS NOT NULL AND r.comment_category != ''
              AND r.comment_category NOT ILIKE '%not available%'
              AND r.comment_category NOT ILIKE '%review not available%'
            GROUP BY 1
            HAVING COUNT(*) >= 3
            ORDER BY count DESC
        `, [productName]);

        const sentimentRes = await db.query(`
            SELECT 
                CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 'Positive'
                    WHEN r.sentiment ILIKE '%Negative%' THEN 'Negative'
                    ELSE 'Neutral'
                END AS sentiment,
                COUNT(*) AS count
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name = $1 AND r.sentiment IS NOT NULL
            GROUP BY 1
        `, [productName]);

        const trendRes = await db.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', r.comment_date), 'Mon YY') AS month,
                DATE_TRUNC('month', r.comment_date) AS month_date,
                COUNT(*) AS total,
                COUNT(CASE WHEN r.sentiment ILIKE '%Positive%' THEN 1 END) AS positive,
                COUNT(CASE WHEN r.sentiment ILIKE '%Negative%' THEN 1 END) AS negative,
                COUNT(CASE WHEN r.sentiment NOT ILIKE '%Positive%' AND r.sentiment NOT ILIKE '%Negative%' THEN 1 END) AS neutral
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name = $1 AND r.comment_date IS NOT NULL
            GROUP BY DATE_TRUNC('month', r.comment_date)
            ORDER BY month_date DESC
            LIMIT 12
        `, [productName]);

        const sourceRes = await db.query(`
            SELECT 
                COALESCE(pl.platform_name, 'E-commerce') AS source,
                COUNT(*) AS count,
                COUNT(CASE WHEN r.sentiment ILIKE '%Positive%' THEN 1 END) AS positive,
                COUNT(CASE WHEN r.sentiment ILIKE '%Negative%' THEN 1 END) AS negative
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            LEFT JOIN feedback.platforms pl ON r.platform_id = pl.platform_id
            WHERE p.product_name = $1
            GROUP BY pl.platform_name
            ORDER BY count DESC
        `, [productName]);

        // Build dynamic WHERE conditions
        const queryParams = [productName];
        let paramIdx = 2;
        let extraWhere = '';

        if (sentimentFilter && sentimentFilter !== 'All') {
            if (sentimentFilter === 'Positive') {
                extraWhere += ` AND r.sentiment ILIKE '%Positive%'`;
            } else if (sentimentFilter === 'Negative') {
                extraWhere += ` AND r.sentiment ILIKE '%Negative%'`;
            } else {
                extraWhere += ` AND r.sentiment NOT ILIKE '%Positive%' AND r.sentiment NOT ILIKE '%Negative%'`;
            }
        }
        if (categoryFilter && categoryFilter !== 'All') {
            extraWhere += ` AND (${CAT_NORMALIZE('r.comment_category')}) = $${paramIdx}`;
            queryParams.push(categoryFilter);
            paramIdx++;
        }

        const countRes = await db.query(`
            SELECT COUNT(*) AS total
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name = $1
              AND r.review_detail IS NOT NULL AND r.review_detail != ''
              ${extraWhere}
        `, queryParams);
        const totalFeedback = parseInt(countRes.rows[0].total);

        const feedbackRes = await db.query(`
            SELECT 
                r.review_detail AS complaint_text,
                ${CAT_NORMALIZE('r.comment_category')} AS complaint_category,
                CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 'Positive'
                    WHEN r.sentiment ILIKE '%Negative%' THEN 'Negative'
                    ELSE 'Neutral'
                END AS sentiment,
                CASE 
                    WHEN r.sentiment ILIKE '%Positive%' THEN 1
                    WHEN r.sentiment ILIKE '%Negative%' THEN -1
                    ELSE 0
                END AS sentiment_score,
                r.comment_date AS date,
                COALESCE(pl.platform_name, 'E-commerce') AS source,
                r.customer_name
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            LEFT JOIN feedback.platforms pl ON r.platform_id = pl.platform_id
            WHERE p.product_name = $1
              AND r.review_detail IS NOT NULL AND r.review_detail != ''
              ${extraWhere}
            ORDER BY r.comment_date DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `, [...queryParams, limit, offset]);

        res.json({
            productName,
            summary: {
                total: parseInt(summaryRes.rows[0]?.total || 0),
                positive_count: parseInt(summaryRes.rows[0]?.positive_count || 0),
                negative_count: parseInt(summaryRes.rows[0]?.negative_count || 0),
                neutral_count: parseInt(summaryRes.rows[0]?.neutral_count || 0),
                avg_score: parseFloat(summaryRes.rows[0]?.avg_score || 0),
                min_score: parseFloat(summaryRes.rows[0]?.min_score || -1),
                max_score: parseFloat(summaryRes.rows[0]?.max_score || 1),
                product_category: summaryRes.rows[0]?.product_category || 'Uncategorized'
            },
            categories: categoryRes.rows.map(r => ({ ...r, count: parseInt(r.count) })),
            sentiments: sentimentRes.rows.map(r => ({ ...r, count: parseInt(r.count) })),
            monthlyTrend: trendRes.rows.reverse().map(r => ({
                month: r.month,
                total: parseInt(r.total),
                positive: parseInt(r.positive),
                negative: parseInt(r.negative),
                neutral: parseInt(r.neutral)
            })),
            sourceBreakdown: sourceRes.rows.map(r => ({
                source: r.source,
                count: parseInt(r.count),
                positive: parseInt(r.positive),
                negative: parseInt(r.negative)
            })),
            feedback: feedbackRes.rows,
            pagination: {
                page,
                limit,
                total: totalFeedback,
                totalPages: Math.ceil(totalFeedback / limit)
            }
        });
    } catch (err) {
        console.error("Error fetching product details", err);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

// Yearly drill-down: all years → months with sentiment counts for a product
router.get('/products/:productName/yearly-drill', async (req, res) => {
    try {
        const { productName } = req.params;

        const result = await db.query(`
            SELECT
                EXTRACT(YEAR FROM r.comment_date)::INT AS year,
                TO_CHAR(DATE_TRUNC('month', r.comment_date), 'Mon YY') AS month_label,
                DATE_TRUNC('month', r.comment_date) AS month_date,
                EXTRACT(MONTH FROM r.comment_date)::INT AS month_num,
                COUNT(*) AS total,
                COUNT(CASE WHEN r.sentiment ILIKE '%Positive%' THEN 1 END) AS positive,
                COUNT(CASE WHEN r.sentiment ILIKE '%Negative%' THEN 1 END) AS negative,
                COUNT(CASE WHEN r.sentiment NOT ILIKE '%Positive%' AND r.sentiment NOT ILIKE '%Negative%' THEN 1 END) AS neutral
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            WHERE p.product_name = $1 AND r.comment_date IS NOT NULL
            GROUP BY 1, 2, 3, 4
            ORDER BY 1 DESC, 3 ASC
        `, [productName]);

        // Aggregate into { year, total, positive, negative, neutral, months: [...] }
        const yearMap = {};
        for (const row of result.rows) {
            const y = row.year;
            if (!yearMap[y]) yearMap[y] = { year: y, total: 0, positive: 0, negative: 0, neutral: 0, months: [] };
            const t = parseInt(row.total), p = parseInt(row.positive), n = parseInt(row.negative), u = parseInt(row.neutral);
            yearMap[y].total    += t;
            yearMap[y].positive += p;
            yearMap[y].negative += n;
            yearMap[y].neutral  += u;
            yearMap[y].months.push({ monthLabel: row.month_label, monthNum: row.month_num, total: t, positive: p, negative: n, neutral: u });
        }

        res.json(Object.values(yearMap));
    } catch (err) {
        console.error('Error fetching yearly drill', err);
        res.status(500).json({ error: 'Failed to fetch yearly drill data' });
    }
});

// Month drill-down: all reviews for a specific month label (e.g. "Mar 24")
router.get('/products/:productName/month-reviews', async (req, res) => {
    try {
        const { productName } = req.params;
        const { month } = req.query; // format: "Mar 24"

        if (!month) return res.status(400).json({ error: 'month query param required' });

        const result = await db.query(`
            SELECT
                r.review_detail AS complaint_text,
                CASE
                    WHEN r.sentiment ILIKE '%Positive%' THEN 'Positive'
                    WHEN r.sentiment ILIKE '%Negative%' THEN 'Negative'
                    ELSE 'Neutral'
                END AS sentiment,
                ${CAT_NORMALIZE('r.comment_category')} AS complaint_category,
                r.comment_date AS date,
                COALESCE(pl.platform_name, 'E-commerce') AS source,
                r.customer_name
            FROM feedback.reviews r
            JOIN feedback.products p ON r.product_id = p.product_id
            LEFT JOIN feedback.platforms pl ON r.platform_id = pl.platform_id
            WHERE p.product_name = $1
              AND TO_CHAR(DATE_TRUNC('month', r.comment_date), 'Mon YY') = $2
              AND r.review_detail IS NOT NULL AND r.review_detail != ''
            ORDER BY
                CASE WHEN r.sentiment ILIKE '%Positive%' THEN 0
                     WHEN r.sentiment ILIKE '%Negative%' THEN 1
                     ELSE 2 END,
                r.comment_date DESC
        `, [productName, month]);

        const positive = result.rows.filter(r => r.sentiment === 'Positive');
        const negative = result.rows.filter(r => r.sentiment === 'Negative');
        const neutral  = result.rows.filter(r => r.sentiment === 'Neutral');

        res.json({ month, total: result.rows.length, positive, negative, neutral });
    } catch (err) {
        console.error('Error fetching month reviews', err);
        res.status(500).json({ error: 'Failed to fetch month reviews' });
    }
});

router.get('/export', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM complaints ORDER BY date DESC');
        const rows = result.rows;
        if (rows.length === 0) return res.send('No data');
        
        const headers = Object.keys(rows[0]).join(',');
        const csv = rows.map(r => 
            Object.values(r).map(val => {
                let str = String(val !== null ? val : '');
                str = str.replace(/"/g, '""');
                return '"' + str + '"';
            }).join(',')
        ).join('\n');
        
        res.header('Content-Type', 'text/csv');
        res.attachment('complaints_export.csv');
        res.send(headers + '\n' + csv);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

module.exports = router;

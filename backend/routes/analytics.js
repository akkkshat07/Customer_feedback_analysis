const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/dashboard-data', async (req, res) => {
    try {
        const totalRes = await db.query(`SELECT COUNT(*) FROM feedback.complaints`);
        const totalComplaints = parseInt(totalRes.rows[0].count);

        const categoryRes = await db.query(`
            SELECT complaint_category, COUNT(*) AS count
            FROM feedback.complaints
            WHERE complaint_category IS NOT NULL AND complaint_category != ''
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 8
        `);

        const productRes = await db.query(`
            SELECT product_name, COUNT(*) AS count
            FROM feedback.complaints
            WHERE product_name IS NOT NULL
            GROUP BY product_name
            ORDER BY count DESC
            LIMIT 10
        `);

        const sentimentRes = await db.query(`
            SELECT sentiment, COUNT(*) AS count
            FROM feedback.complaints
            WHERE sentiment IS NOT NULL AND sentiment != ''
            GROUP BY 1
        `);

        const trendRes = await db.query(`
            SELECT DATE_TRUNC('month', date) AS day, COUNT(*) AS count
            FROM feedback.complaints
            WHERE date IS NOT NULL
            GROUP BY day
            ORDER BY day DESC
            LIMIT 12
        `);

        const recentRes = await db.query(`
            SELECT product_name, complaint_category, sentiment, date
            FROM feedback.complaints
            WHERE complaint_text IS NOT NULL AND complaint_text != ''
            ORDER BY date DESC
            LIMIT 50
        `);

        res.json({
            totalComplaints,
            complaintsByCategory: categoryRes.rows,
            complaintsByProduct: productRes.rows,
            sentimentDistribution: sentimentRes.rows,
            trendOverTime: trendRes.rows.reverse(),
            recentComplaints: recentRes.rows
        });

    } catch (err) {
        console.error("Error fetching dashboard data", err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

router.get('/product-categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                product_category,
                COUNT(DISTINCT product_name) AS product_count,
                COUNT(*) AS total_feedback
            FROM feedback.complaints
            GROUP BY product_category
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
                product_name,
                product_category,
                COUNT(*) AS total_complaints,
                COUNT(CASE WHEN sentiment = 'Negative' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN sentiment = 'Positive' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN sentiment = 'Neutral' THEN 1 END) AS neutral_count,
                ROUND(AVG(sentiment_score)::NUMERIC, 2) AS avg_sentiment_score
            FROM feedback.complaints
            GROUP BY product_name, product_category
            ORDER BY total_complaints DESC
        `);

        const topCategories = await db.query(`
            SELECT product_name, ranked.complaint_category AS top_category
            FROM (
                SELECT product_name, complaint_category, COUNT(*) AS cnt,
                       ROW_NUMBER() OVER (PARTITION BY product_name ORDER BY COUNT(*) DESC) AS rn
                FROM feedback.complaints
                WHERE complaint_category IS NOT NULL AND complaint_category != ''
                GROUP BY product_name, complaint_category
            ) ranked
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
                COUNT(*) AS total,
                COUNT(CASE WHEN sentiment = 'Positive' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN sentiment = 'Negative' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN sentiment = 'Neutral' THEN 1 END) AS neutral_count,
                ROUND(AVG(sentiment_score)::NUMERIC, 2) AS avg_score,
                MAX(product_category) AS product_category
            FROM feedback.complaints
            WHERE product_name = $1
        `, [productName]);

        const categoryRes = await db.query(`
            SELECT 
                complaint_category,
                COUNT(*) AS count
            FROM feedback.complaints
            WHERE product_name = $1
              AND complaint_category IS NOT NULL AND complaint_category != ''
            GROUP BY 1
            ORDER BY count DESC
        `, [productName]);

        const sentimentRes = await db.query(`
            SELECT sentiment, COUNT(*) AS count
            FROM feedback.complaints
            WHERE product_name = $1 AND sentiment IS NOT NULL
            GROUP BY 1
        `, [productName]);

        const trendRes = await db.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', date), 'Mon YY') AS month,
                DATE_TRUNC('month', date) AS month_date,
                COUNT(*) AS total,
                COUNT(CASE WHEN sentiment = 'Positive' THEN 1 END) AS positive,
                COUNT(CASE WHEN sentiment = 'Negative' THEN 1 END) AS negative,
                COUNT(CASE WHEN sentiment = 'Neutral' THEN 1 END) AS neutral
            FROM feedback.complaints
            WHERE product_name = $1 AND date IS NOT NULL
            GROUP BY DATE_TRUNC('month', date)
            ORDER BY month_date DESC
            LIMIT 12
        `, [productName]);

        const sourceRes = await db.query(`
            SELECT 
                source,
                COUNT(*) AS count,
                COUNT(CASE WHEN sentiment = 'Positive' THEN 1 END) AS positive,
                COUNT(CASE WHEN sentiment = 'Negative' THEN 1 END) AS negative
            FROM feedback.complaints
            WHERE product_name = $1
            GROUP BY source
            ORDER BY count DESC
        `, [productName]);

        // Build dynamic WHERE conditions
        const queryParams = [productName];
        let paramIdx = 2;
        let extraWhere = '';

        if (sentimentFilter && sentimentFilter !== 'All') {
            extraWhere += ` AND sentiment = $${paramIdx}`;
            queryParams.push(sentimentFilter);
            paramIdx++;
        }
        if (categoryFilter && categoryFilter !== 'All') {
            extraWhere += ` AND complaint_category = $${paramIdx}`;
            queryParams.push(categoryFilter);
            paramIdx++;
        }

        const countRes = await db.query(`
            SELECT COUNT(*) AS total
            FROM feedback.complaints
            WHERE product_name = $1
              AND complaint_text IS NOT NULL AND complaint_text != ''
              ${extraWhere}
        `, queryParams);
        const totalFeedback = parseInt(countRes.rows[0].total);

        const feedbackRes = await db.query(`
            SELECT 
                complaint_text,
                complaint_category,
                sentiment,
                sentiment_score,
                date,
                source,
                customer_name
            FROM feedback.complaints
            WHERE product_name = $1
              AND complaint_text IS NOT NULL AND complaint_text != ''
              ${extraWhere}
            ORDER BY date DESC
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
                min_score: -1,
                max_score: 1,
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

router.get('/export', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM feedback.complaints ORDER BY date DESC');
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

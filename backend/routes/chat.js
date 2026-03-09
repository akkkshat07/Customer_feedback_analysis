const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory conversation history per thread
const conversationHistory = {};

// Tool: Query database for analytics
async function queryDatabase(sql) {
    try {
        const safe = sql.trim().toLowerCase();
        if (!safe.startsWith('select')) {
            return 'Error: Only SELECT queries are allowed.';
        }
        const res = await db.query(sql);
        if (res.rows.length === 0) return 'No results found.';
        return JSON.stringify(res.rows.slice(0, 100));
    } catch (err) {
        return `Query error: ${err.message}`;
    }
}

// Tool: Semantic search via keyword fallback
async function semanticSearch(query) {
    try {
        const keywords = query.split(/\s+/).filter(w => w.length > 3).slice(0, 5).map(w => `%${w}%`);
        const conditions = keywords.map((_, i) => `(r.review_detail ILIKE $${i + 1} OR r.review_title ILIKE $${i + 1})`).join(' OR ');
        const fallbackSql = conditions
            ? `SELECT p.product_name, b.brand_name, r.review_detail AS complaint_text, r.sentiment, r.comment_category FROM feedback.reviews r JOIN feedback.products p ON r.product_id = p.product_id JOIN feedback.brands b ON r.brand_id = b.brand_id WHERE ${conditions} LIMIT 15`
            : `SELECT p.product_name, b.brand_name, r.review_detail AS complaint_text, r.sentiment, r.comment_category FROM feedback.reviews r JOIN feedback.products p ON r.product_id = p.product_id JOIN feedback.brands b ON r.brand_id = b.brand_id LIMIT 15`;
        const res = await db.query(fallbackSql, keywords);
        if (res.rows.length === 0) return 'No matching reviews found for this topic.';
        return JSON.stringify(res.rows);
    } catch (err) {
        return `Search error: ${err.message}`;
    }
}

// Tool declarations for Gemini function calling
const toolDeclarations = [
    {
        functionDeclarations: [
            {
                name: "query_database",
                description: `Executes a read-only SQL SELECT query on the customer feedback database.
Schema: feedback. Main tables:
- feedback.reviews (r): review_id, product_id, brand_id, platform_id, comment_date, review_title, review_detail, comment_type, comment_category, sentiment ('Positive'/'Negative'), customer_name, source_sheet, source_file
- feedback.products (p): product_id, product_name, brand_id, product_category
- feedback.brands (b): brand_id, brand_name ('Blue Heaven', "Nature's Essence")
- feedback.platforms: platform_id, platform_name ('Amazon', 'Nykaa')
Always qualify table names with schema prefix 'feedback.' (e.g. feedback.reviews). Join products and brands for readable output.`,
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sql: {
                            type: "STRING",
                            description: "The SQL SELECT query to execute. Always use feedback.tablename."
                        }
                    },
                    required: ["sql"]
                }
            },
            {
                name: "semantic_search",
                description: "Searches feedback.reviews using keyword matching on review text. Use for qualitative questions like 'what are customers saying about packaging' or 'show complaints about smell'.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: {
                            type: "STRING",
                            description: "The natural language search query"
                        }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

const SYSTEM_INSTRUCTION = `You are Esme, an elite Data Scientist and Customer Intelligence Executive for Esme Beauty & Skincare.

You have direct access to a PostgreSQL database. Use ONLY the feedback schema:
- feedback.reviews: review_id, product_id, brand_id, platform_id, comment_date, review_title, review_detail, comment_type, comment_category, sentiment ('Positive'/'Negative'), customer_name, source_sheet, source_file
- feedback.products: product_id, product_name, brand_id, product_category
- feedback.brands: brand_id, brand_name ('Blue Heaven', "Nature's Essence")
- feedback.platforms: platform_id, platform_name ('Amazon', 'Nykaa')
Total reviews: ~15,375. Always JOIN products and brands for product names.

RESPONSE FORMATTING (STRICT):
1. ALWAYS start with a 1-2 sentence executive summary.
2. ALWAYS USE MARKDOWN TABLES for any list of products, metrics, or comparisons. Never use plain bullet lists for tabular data.
3. USE HEADERS (##, ###) to organize sections: Summary, Breakdown, Key Insights, Recommendations.
4. QUOTE CUSTOMERS: For qualitative questions, use > blockquotes with actual review_detail text from the DB.
5. SENTIMENT: sentiment column values are exactly 'Positive' or 'Negative'. Use these exact strings in WHERE clauses.
6. PERCENTAGES: Always show percentages alongside counts.
7. NO FILLER: Skip greetings/sign-offs. Start immediately with data.

HOW TO EXECUTE:
- Step 1: Query aggregate counts to understand the landscape.
- Step 2: For text analysis, retrieve actual review_detail and quote customers.
- Step 3: Break down by brand, product, category, or platform as needed.
- Step 4: End with 2-3 actionable recommendations in a numbered list.

Example good queries:
- SELECT p.product_name, COUNT(*) as total, SUM(CASE WHEN r.sentiment='Positive' THEN 1 ELSE 0 END) as positive FROM feedback.reviews r JOIN feedback.products p ON r.product_id=p.product_id GROUP BY p.product_name ORDER BY total DESC LIMIT 10
- SELECT r.comment_category, COUNT(*) as cnt FROM feedback.reviews r GROUP BY r.comment_category ORDER BY cnt DESC`;


router.post('/', async (req, res) => {
    try {
        const { message, threadId = 'default', fileContext } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        if (!conversationHistory[threadId]) conversationHistory[threadId] = [];
        const history = conversationHistory[threadId];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: toolDeclarations,
        });

        const chat = model.startChat({ history });

        // Prepend file context to message if provided
        const fullMessage = fileContext
            ? `[Attached file: ${fileContext.name}]\n\n${fileContext.content}\n\n---\nUser question: ${message}`
            : message;

        let response = await chat.sendMessage(fullMessage);
        let responseCandidate = response.response;

        // Agentic tool loop — keep calling tools until we get a final text
        let iterations = 0;
        while (responseCandidate.functionCalls() && responseCandidate.functionCalls().length > 0 && iterations < 5) {
            iterations++;
            const functionCalls = responseCandidate.functionCalls();
            const toolResults = [];

            for (const call of functionCalls) {
                let result;
                if (call.name === 'query_database') {
                    result = await queryDatabase(call.args.sql);
                } else if (call.name === 'semantic_search') {
                    result = await semanticSearch(call.args.query);
                } else {
                    result = 'Unknown tool';
                }
                toolResults.push({
                    functionResponse: { name: call.name, response: { result } }
                });
            }

            response = await chat.sendMessage(toolResults);
            responseCandidate = response.response;
        }

        const finalText = responseCandidate.text();

        // Update history
        history.push({ role: 'user', parts: [{ text: message }] });
        history.push({ role: 'model', parts: [{ text: finalText }] });
        if (history.length > 40) conversationHistory[threadId] = history.slice(-40);

        res.json({ response: finalText });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ error: 'Failed to process: ' + error.message });
    }
});

module.exports = router;

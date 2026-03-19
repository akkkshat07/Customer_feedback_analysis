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
        // Ensure feedback schema is used if not specified
        let finalSql = sql;
        if (!safe.includes('feedback.')) {
            finalSql = sql.replace(/from\s+(\w+)/gi, 'FROM feedback.$1');
        }
        
        const res = await db.query(finalSql);
        if (res.rows.length === 0) return 'No results found.';
        return JSON.stringify(res.rows.slice(0, 50));
    } catch (err) {
        return `Query error: ${err.message}`;
    }
}

// Tool: Semantic search via keyword fallback
async function semanticSearch(query) {
    try {
        const keywords = query.split(/\s+/).filter(w => w.length > 3).slice(0, 5).map(w => `%${w}%`);
        const conditions = keywords.map((_, i) => `(complaint_text ILIKE $${i + 1} OR complaint_category ILIKE $${i + 1})`).join(' OR ');
        
        const sql = conditions
            ? `SELECT product_name, complaint_text, sentiment, complaint_category, date FROM feedback.complaints WHERE ${conditions} ORDER BY date DESC LIMIT 15`
            : `SELECT product_name, complaint_text, sentiment, complaint_category, date FROM feedback.complaints ORDER BY date DESC LIMIT 15`;
            
        const res = await db.query(sql, keywords);
        if (res.rows.length === 0) return 'No matching feedback found for this topic.';
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
Main table: feedback.complaints
Columns: id, product_name, product_category, complaint_text, complaint_category, sentiment ('Positive', 'Negative', 'Neutral'), sentiment_score (numeric), source, customer_name, customer_contact, date, order_id.
Always use feedback.complaints in your queries.`,
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sql: {
                            type: "STRING",
                            description: "The SQL SELECT query to execute. e.g. SELECT product_name, COUNT(*) FROM feedback.complaints GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
                        }
                    },
                    required: ["sql"]
                }
            },
            {
                name: "semantic_search",
                description: "Searches feedback text using keyword matching. Use for qualitative questions like 'what are customers saying about packaging' or 'show complaints about smell'.",
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

You have direct access to a PostgreSQL database via the feedback.complaints table.
Columns: product_name, product_category, complaint_text, complaint_category, sentiment, sentiment_score, source, date.

RESPONSE FORMATTING (STRICT):
1. ALWAYS start with a 1-2 sentence executive summary of what you found.
2. ALWAYS USE MARKDOWN TABLES for any lists or comparisons.
3. USE HEADERS (##, ###) to organize sections: Summary, Breakdown, Key Insights, Recommendations.
4. QUOTE CUSTOMERS: For qualitative questions, use > blockquotes with actual complaint_text from the DB.
5. NO FILLER: Skip greetings/sign-offs. Start immediately with data.

HOW TO EXECUTE:
- Step 1: Query aggregate counts to understand the landscape.
- Step 2: For text analysis, retrieve actual complaint_text and quote customers.
- Step 3: Break down by product or category as needed.
- Step 4: End with 2-3 actionable recommendations.`;


router.post('/', async (req, res) => {
    try {
        const { message, threadId = 'default', fileContext } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        if (!conversationHistory[threadId]) conversationHistory[threadId] = [];
        const history = conversationHistory[threadId];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: toolDeclarations,
        });

        const chat = model.startChat({ history });

        const fullMessage = fileContext
            ? `[Attached file: ${fileContext.name}]\n\n${fileContext.content}\n\n---\nUser question: ${message}`
            : message;

        let response = await chat.sendMessage(fullMessage);
        let responseCandidate = response.response;

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

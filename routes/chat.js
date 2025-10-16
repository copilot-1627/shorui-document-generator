const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { chatSessions, usageLimits, getUserUsage } = require('../models/data');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user.isComplete) {
        return res.redirect('/');
    }
    next();
};

// Chat interface route
router.get('/', requireAuth, (req, res) => {
    res.render('chat', {
        title: 'New Document - Shorui'
    });
});

// Get specific chat session
router.get('/:sessionId', requireAuth, (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const session = chatSessions.find(s => s.id === sessionId && s.userId === req.user.id);
    
    if (!session) {
        return res.redirect('/dashboard');
    }
    
    res.render('chat-session', {
        session: session,
        title: `${session.topic} - Shorui`
    });
});

// Generate document route
router.post('/generate', requireAuth, async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic || topic.trim() === '') {
            return res.status(400).json({ error: 'Topic is required' });
        }
        
        // Check usage limits
        const usage = getUserUsage(req.user.id);
        if (usage.documentsGenerated >= usage.monthlyLimit) {
            return res.status(429).json({ error: 'Monthly document limit reached' });
        }
        
        // Simulate AI call to Perplexity API
        const aiResponse = await callPerplexityAPI(topic);
        
        // Create new chat session
        const newSession = {
            id: chatSessions.length + 1,
            userId: req.user.id,
            topic: topic,
            aiResponse: aiResponse,
            generatedFile: extractFilenameFromResponse(aiResponse),
            timestamp: new Date(),
            status: "completed"
        };
        
        chatSessions.push(newSession);
        
        // Update usage
        if (usageLimits[req.user.id]) {
            usageLimits[req.user.id].documentsGenerated++;
        }
        
        res.json({
            success: true,
            sessionId: newSession.id,
            response: aiResponse,
            filename: newSession.generatedFile
        });
        
    } catch (error) {
        console.error('Error generating document:', error);
        res.status(500).json({ error: 'Failed to generate document' });
    }
});

// Download document route
router.get('/download/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    
    // In a real application, you would serve the actual file
    // For demo purposes, we'll simulate a download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Simulate file content
    const demoContent = `Demo document content for: ${filename}`;
    res.send(demoContent);
});

// Function to call Perplexity API (simulated)
async function callPerplexityAPI(topic) {
    // In production, replace this with actual Perplexity API call
    const systemPrompt = `You are a document generator. Generate Python code that creates professional documents based on the given topic. Your response should ONLY contain: 1) A JSON object with the filename (format: topic-doc-{random6digits}.docx), 2) Python code block that uses python-docx library to create the document. Do not provide any other text or explanations.`;
    
    try {
        // Simulate API call - in production use actual Perplexity API
        const mockResponse = generateMockAIResponse(topic);
        return mockResponse;
        
        /* Uncomment and configure for actual Perplexity API usage:
        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: 'claude-3.5-sonnet',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate a document about: ${topic}` }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
        */
    } catch (error) {
        console.error('AI API Error:', error);
        throw new Error('Failed to generate document with AI');
    }
}

// Generate mock AI response for demo
function generateMockAIResponse(topic) {
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${topic.toLowerCase().replace(/\\s+/g, '-')}-doc-${randomId}.docx`;
    
    const responses = {
        'business proposal': {
            json: { filename: filename },
            python: `from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Title
title = doc.add_heading('Business Proposal', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Executive Summary
doc.add_heading('Executive Summary', level=1)
doc.add_paragraph('This business proposal outlines a comprehensive strategy for market expansion and growth.')

# Market Analysis
doc.add_heading('Market Analysis', level=1)
doc.add_paragraph('Current market conditions show significant opportunities for growth in our target sector.')

# Financial Projections
doc.add_heading('Financial Projections', level=1)
table = doc.add_table(rows=4, cols=3)
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'Year'
hdr_cells[1].text = 'Revenue'
hdr_cells[2].text = 'Profit'

doc.save('${filename}')
print('Business proposal document generated successfully!')`
        },
        'project report': {
            json: { filename: filename },
            python: `from docx import Document
from docx.shared import Inches

doc = Document()

# Title
doc.add_heading('Project Report', 0)

# Introduction
doc.add_heading('1. Introduction', level=1)
doc.add_paragraph('This report provides a comprehensive overview of the project objectives and outcomes.')

# Methodology
doc.add_heading('2. Methodology', level=1)
doc.add_paragraph('The project followed a structured approach with defined phases and milestones.')

# Results
doc.add_heading('3. Results', level=1)
doc.add_paragraph('Key findings and achievements are outlined in this section.')

# Conclusion
doc.add_heading('4. Conclusion', level=1)
doc.add_paragraph('The project was completed successfully within the specified timeframe.')

doc.save('${filename}')
print('Project report generated successfully!')`
        }
    };
    
    // Find matching template or use default
    const matchedKey = Object.keys(responses).find(key => 
        topic.toLowerCase().includes(key)
    );
    
    const template = responses[matchedKey] || {
        json: { filename: filename },
        python: `from docx import Document

doc = Document()
doc.add_heading('${topic}', 0)
doc.add_paragraph('This document was automatically generated based on the topic: ${topic}')
doc.add_paragraph('Content goes here...')
doc.save('${filename}')
print('Document generated successfully!')`
    };
    
    return `\`\`\`json
${JSON.stringify(template.json, null, 2)}
\`\`\`

\`\`\`python
${template.python}
\`\`\``;
}

// Extract filename from AI response
function extractFilenameFromResponse(response) {
    try {
        const jsonMatch = response.match(/\`\`\`json\s*([\s\S]*?)\`\`\`/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            return jsonData.filename;
        }
    } catch (error) {
        console.error('Error extracting filename:', error);
    }
    return `document-${Date.now()}.docx`;
}

module.exports = router;
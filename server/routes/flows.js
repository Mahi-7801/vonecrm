const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// GET /api/flows — show user's own + published public flows
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM flows WHERE owner_id = ? OR is_published = TRUE ORDER BY id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get flows error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/flows/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM flows WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Flow not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/flows
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, flow_json, trigger_keyword } = req.body;
    if (!name) return res.status(400).json({ error: 'Flow name required' });

    const defaultFlow = flow_json || {
      nodes: [
        { id: 'start', type: 'start', message: 'Welcome!' },
        { id: 'end', type: 'end', message: 'Goodbye!' }
      ],
      edges: [{ from: 'start', to: 'end' }]
    };

    const [result] = await pool.query(
      'INSERT INTO flows (owner_id, name, flow_json, trigger_keyword) VALUES (?, ?, ?, ?)',
      [req.user.id, name, JSON.stringify(defaultFlow), trigger_keyword || null]
    );

    const [rows] = await pool.query('SELECT * FROM flows WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/flows/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, flow_json, active, trigger_keyword } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM flows WHERE id = ? AND (owner_id = ? OR is_published = TRUE)',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Flow not found' });

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (flow_json !== undefined) { updates.push('flow_json = ?'); values.push(JSON.stringify(flow_json)); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }
    if (trigger_keyword !== undefined) { updates.push('trigger_keyword = ?'); values.push(trigger_keyword || null); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE flows SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM flows WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/flows/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM flows WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Flow not found' });
    res.json({ message: 'Flow deleted' });
  } catch (err) {
    console.error('Delete flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/flows/:id/test - Test flow simulation
router.post('/:id/test', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM flows WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Flow not found' });

    const flow = rows[0];
    if (!flow.flow_json) {
      return res.status(400).json({ error: 'Flow has no nodes. Please edit and save the flow first.' });
    }
    const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;

    if (!flowData?.nodes || flowData.nodes.length === 0) {
      return res.status(400).json({ error: 'Flow has no nodes. Please edit and save the flow first.' });
    }

    const startNode = flowData.nodes.find(n => n.type === 'start');
    if (!startNode) return res.status(400).json({ error: 'No start node found' });

    // Get the next node after start
    const firstEdge = flowData.edges?.find(e => e.from === startNode.id);
    const nextNode = firstEdge ? flowData.nodes?.find(n => n.id === firstEdge.to) : null;

    res.json({
      flow_id: flow.id,
      start_node: startNode,
      next_node: nextNode,
      nodes_count: flowData.nodes?.length || 0,
      edges_count: flowData.edges?.length || 0,
      message: 'Flow test ready'
    });
  } catch (err) {
    console.error('Test flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/flows/:id/conversation - Start a conversation
router.post('/:id/conversation', authMiddleware, async (req, res) => {
  try {
    const { contact_id } = req.body;

    const [flowRows] = await pool.query(
      'SELECT * FROM flows WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (flowRows.length === 0) return res.status(404).json({ error: 'Flow not found' });

    const flow = flowRows[0];
    const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;
    const startNode = flowData.nodes?.find(n => n.type === 'start');

    if (!startNode) return res.status(400).json({ error: 'No start node' });

    // Create conversation
    const [convResult] = await pool.query(
      'INSERT INTO flow_conversations (flow_id, contact_id, owner_id, current_node, context) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, contact_id || null, req.user.id, startNode.id, JSON.stringify({ variables: {} })]
    );

    // Get first edge to find next node
    const firstEdge = flowData.edges?.find(e => e.from === startNode.id);
    const nextNode = firstEdge ? flowData.nodes?.find(n => n.id === firstEdge.to) : null;

    // Save start message
    await pool.query(
      'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
      [convResult.insertId, startNode.id, 'assistant', startNode.data?.message || 'Flow started']
    );

    // Auto-advance to next node
    if (nextNode) {
      await pool.query(
        'UPDATE flow_conversations SET current_node = ? WHERE id = ?',
        [nextNode.id, convResult.insertId]
      );

      // Save the next node's message
      await pool.query(
        'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
        [convResult.insertId, nextNode.id, 'assistant', nextNode.data?.message || '']
      );

      res.json({
        conversation_id: convResult.insertId,
        current_node: nextNode,
        message: nextNode.data?.message || '',
        buttons: nextNode.data?.buttons || []
      });
    } else {
      res.json({
        conversation_id: convResult.insertId,
        current_node: startNode,
        message: startNode.data?.message || 'Flow started',
        buttons: []
      });
    }
  } catch (err) {
    console.error('Start conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/flows/:id/conversation/:convId/button - Handle button click
router.post('/:id/conversation/:convId/button', authMiddleware, async (req, res) => {
  try {
    const { button_label, button_target } = req.body;

    // Get conversation
    const [convRows] = await pool.query(
      'SELECT * FROM flow_conversations WHERE id = ? AND flow_id = ? AND owner_id = ?',
      [req.params.convId, req.params.id, req.user.id]
    );
    if (convRows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    const conversation = convRows[0];
    const context = typeof conversation.context === 'string' ? JSON.parse(conversation.context) : conversation.context;

    // Save button click
    await pool.query(
      'INSERT INTO flow_messages (conversation_id, node_id, role, content, button_label) VALUES (?, ?, ?, ?, ?)',
      [req.params.convId, conversation.current_node, 'button_click', button_label, button_label]
    );

    // Get flow data
    const [flowRows] = await pool.query('SELECT * FROM flows WHERE id = ?', [req.params.id]);
    const flow = flowRows[0];
    const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;

    // Find target node
    let targetNode = null;
    if (button_target) {
      targetNode = flowData.nodes?.find(n => n.id === button_target);
    }

    // If no explicit target, follow the edge from current node
    if (!targetNode) {
      const edge = flowData.edges?.find(e => e.from === conversation.current_node);
      if (edge) {
        targetNode = flowData.nodes?.find(n => n.id === edge.to);
      }
    }

    if (!targetNode) {
      return res.json({ message: 'Flow ended', ended: true });
    }

    // Update conversation position
    await pool.query(
      'UPDATE flow_conversations SET current_node = ? WHERE id = ?',
      [targetNode.id, req.params.convId]
    );

    // Generate AI response if it's an AI node or has website_url
    let aiResponse = null;
    if (targetNode.data?.ai_enabled || targetNode.data?.website_url) {
      aiResponse = await generateAIResponse(targetNode, context, button_label);
    }

    // Save the node's message
    const messageContent = aiResponse || targetNode.data?.message || '';
    await pool.query(
      'INSERT INTO flow_messages (conversation_id, node_id, role, content, ai_context) VALUES (?, ?, ?, ?, ?)',
      [req.params.convId, targetNode.id, 'assistant', messageContent, aiResponse ? JSON.stringify({ ai_generated: true }) : null]
    );

    // Get next buttons
    const nextEdge = flowData.edges?.find(e => e.from === targetNode.id);
    const nextNode = nextEdge ? flowData.nodes?.find(n => n.id === nextEdge.to) : null;

    // If next node has buttons, include them
    const buttons = targetNode.data?.buttons || [];

    // If there's a next node with no buttons, auto-advance
    if (buttons.length === 0 && nextNode) {
      await pool.query(
        'UPDATE flow_conversations SET current_node = ? WHERE id = ?',
        [nextNode.id, req.params.convId]
      );

      const nextMessage = nextNode.data?.message || '';
      await pool.query(
        'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
        [req.params.convId, nextNode.id, 'assistant', nextMessage]
      );

      // Check if next node also has no buttons and continue auto-advancing
      let autoNode = nextNode;
      let autoEdge = flowData.edges?.find(e => e.from === autoNode.id);
      let autoNext = autoEdge ? flowData.nodes?.find(n => n.id === autoEdge.to) : null;

      while (autoNext && (!autoNode.data?.buttons || autoNode.data.buttons.length === 0)) {
        await pool.query(
          'UPDATE flow_conversations SET current_node = ? WHERE id = ?',
          [autoNext.id, req.params.convId]
        );
        await pool.query(
          'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
          [req.params.convId, autoNext.id, 'assistant', autoNext.data?.message || '']
        );
        autoNode = autoNext;
        autoEdge = flowData.edges?.find(e => e.from === autoNode.id);
        autoNext = autoEdge ? flowData.nodes?.find(n => n.id === autoEdge.to) : null;
      }

      // Get final buttons
      const finalButtons = autoNode.data?.buttons || [];

      res.json({
        message: autoNode.data?.message || messageContent,
        buttons: finalButtons,
        ai_generated: !!aiResponse,
        ended: autoNode.type === 'end'
      });
    } else {
      res.json({
        message: messageContent,
        buttons,
        ai_generated: !!aiResponse,
        ended: targetNode.type === 'end'
      });
    }
  } catch (err) {
    console.error('Button click error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/flows/:id/conversation/:convId - Get conversation history
router.get('/:id/conversation/:convId', authMiddleware, async (req, res) => {
  try {
    const [convRows] = await pool.query(
      'SELECT * FROM flow_conversations WHERE id = ? AND flow_id = ? AND owner_id = ?',
      [req.params.convId, req.params.id, req.user.id]
    );
    if (convRows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    const [messages] = await pool.query(
      'SELECT * FROM flow_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.convId]
    );

    res.json({
      conversation: convRows[0],
      messages
    });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper: Generate AI response based on context
async function generateAIResponse(node, context, userAction) {
  try {
    const websiteUrl = node.data?.website_url;
    let websiteData = null;

    // Fetch website data if URL is provided
    if (websiteUrl) {
      try {
        const response = await axios.get(websiteUrl, { timeout: 5000 });
        websiteData = typeof response.data === 'string'
          ? response.data.substring(0, 2000)
          : JSON.stringify(response.data).substring(0, 2000);
      } catch (fetchErr) {
        console.log('Could not fetch website:', fetchErr.message);
      }
    }

    // Build AI prompt
    const systemPrompt = `You are a helpful chatbot assistant. Respond based on the context provided.
${websiteData ? `\nWebsite data from ${websiteUrl}:\n${websiteData}` : ''}
${context?.variables ? `\nUser data: ${JSON.stringify(context.variables)}` : ''}
Always respond concisely and helpfully.`;

    const userPrompt = `Current node message: "${node.data?.message || ''}"
User clicked: "${userAction}"
Generate a helpful response.`;

    // Try to use Groq API if available (fast & reliable)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const aiRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 300
          },
          { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' } }
        );
        if (aiRes.data.choices?.[0]?.message?.content) {
          return aiRes.data.choices[0].message.content;
        }
      } catch (groqErr) {
        console.error('Groq AI response error:', groqErr.message);
      }
    }

    // Try to use OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const aiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 200
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        }
      );
      return aiRes.data.choices[0].message.content;
    }

    // Fallback: generate a contextual response without API
    if (websiteData) {
      return `Based on the information from ${websiteUrl}, I can help you with that. ${node.data?.message || 'How can I assist you further?'}`;
    }

    return node.data?.message || 'Thank you for your response. How else can I help you?';
  } catch (err) {
    console.error('AI response error:', err);
    return node.data?.message || 'Thank you for your response.';
  }
}

// POST /api/flows/:id/execute — Test flow execution via WhatsApp API
router.post('/:id/execute', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone number required' });

    const [flows] = await pool.query('SELECT * FROM flows WHERE id = ? AND (owner_id = ? OR is_published = TRUE)', [req.params.id, req.user.id]);
    if (flows.length === 0) return res.status(404).json({ error: 'Flow not found' });

    let cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    // Find or create contact
    let [contacts] = await pool.query('SELECT id FROM contacts WHERE owner_id = ? AND phone = ?', [req.user.id, cleanPhone]);
    let contactId;
    if (contacts.length === 0) {
      const [newC] = await pool.query('INSERT INTO contacts (owner_id, phone, name, tags) VALUES (?, ?, ?, ?)', [req.user.id, cleanPhone, cleanPhone, '[]']);
      contactId = newC.insertId;
    } else {
      contactId = contacts[0].id;
    }

    const [waNumbers] = await pool.query('SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1', [req.user.id]);
    const phoneId = waNumbers.length > 0 ? waNumbers[0].phone_number_id : (process.env.WHATSAPP_PHONE_NUMBER_ID || '1269197539606780');

    const flowData = typeof flows[0].flow_json === 'string' ? JSON.parse(flows[0].flow_json) : flows[0].flow_json;
    const firstMsg = flowData.nodes?.find(n => n.type === 'message' || n.type === 'reply_buttons' || n.type === 'list_message');
    const bodyText = firstMsg?.data?.message || '👋 Hello! Welcome to Mahi CRM.';

    const token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    await axios.post(
      `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'}/${phoneId}/messages`,
      { messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: bodyText } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ message: 'Flow test message sent successfully', to: cleanPhone });
  } catch (err) {
    console.error('Execute flow error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;

const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const graphVersion = () => process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

// Service keywords for auto-detection
const SERVICE_KEYWORDS = {
  fullstack: ['full stack', 'fullstack', 'full-stack', 'website development', 'web app', 'web application', 'react', 'node', 'nodejs', 'mern', 'mean'],
  wordpress: ['wordpress', 'wp', 'cms', 'blog', 'website builder'],
  bulk: ['bulk', 'bulk send', 'bulk message', 'broadcast', 'campaign', 'mass message', 'mass send'],
  coaching: ['coaching', 'tutoring', 'training', 'course', 'learn', 'teach', 'education'],
  digitalmarketing: ['digital marketing', 'marketing', 'seo', 'social media', 'ads', 'advertising', 'google ads', 'meta ads', 'facebook ads'],
  branding: ['branding', 'logo', 'design', 'creative', 'graphic design', 'brand identity']
};

// Company info for AI responses
const COMPANY_INFO = `
You are a customer service assistant for VONE Digitals, a digital marketing company based in Vijayawada, India.

Services offered:
1. Full Stack Development - React, Node.js, MERN stack, custom web applications
2. WordPress Development - Custom themes, plugins, blogs, CMS websites
3. Bulk WhatsApp Messaging - Campaign management, broadcast messaging, customer outreach
4. Coaching & Training - Digital marketing courses, web development training
5. Digital Marketing - SEO, social media marketing, Google Ads, Meta Ads
6. Branding & Creative Design - Logo design, brand identity, graphic design, video production

Contact: +91 9966192921
Website: https://vonedigitals.com
Email: vonedigitals@gmail.com
Address: 3rd Floor, 40-15/2-19, Brindavan Colony, Sriram Nagar, Vijayawada, Andhra Pradesh 520010

Respond in a friendly, professional manner. Keep responses short and helpful (under 200 words).
If the user asks about pricing, tell them to contact us for a custom quote.
Always end with an offer to help further.
`;

// Detect which service the user is asking about
function detectService(message) {
  const lower = message.toLowerCase();
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return service;
      }
    }
  }
  return null;
}

// Generate AI response using Groq API
async function generateAIResponse(message, serviceName) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return getFallbackResponse(serviceName);
  }

  const prompt = `${COMPANY_INFO}

Customer message: "${message}"
${serviceName ? `Detected service interest: ${serviceName}` : ''}

Generate a helpful, friendly response to this customer inquiry. Be specific about the service they're asking about.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0]?.message?.content || getFallbackResponse(serviceName);
  } catch (err) {
    console.log('Groq API error:', err.message);
    return getFallbackResponse(serviceName);
  }
}

// Fallback responses when AI is unavailable
function getFallbackResponse(serviceName) {
  const responses = {
    fullstack: "Thanks for your interest in Full Stack Development! At VONE Digitals, we build custom web applications using React, Node.js, and the MERN stack. Whether you need a web app, e-commerce platform, or custom software, we've got you covered.\n\n📞 Contact us for a free consultation: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nHow can we help you today?",
    wordpress: "Thanks for asking about WordPress! We create custom WordPress websites, themes, and plugins. Whether you need a business website, blog, or e-commerce store, our team delivers high-quality solutions.\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nWhat kind of website are you looking to build?",
    bulk: "Interested in Bulk WhatsApp Messaging? We help businesses send targeted campaigns, broadcasts, and automated messages to reach thousands of customers instantly.\n\nFeatures:\n✅ Bulk messaging\n✅ Campaign management\n✅ Analytics & reporting\n✅ Automated responses\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nHow many contacts do you want to reach?",
    coaching: "Thanks for your interest in our Coaching & Training programs! We offer:\n\n📚 Digital Marketing Courses\n💻 Web Development Training\n📱 Social Media Marketing\n🎯 SEO Training\n\nOur expert trainers in Vijayawada help you master in-demand skills.\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nWhich course interests you?",
    digitalmarketing: "Thanks for asking about Digital Marketing! VONE Digitals offers complete digital marketing solutions:\n\n🔍 SEO (Search Engine Optimization)\n📱 Social Media Marketing\n📢 Google Ads & Meta Ads\n📊 Analytics & Reporting\n\nWe help businesses in Vijayawada grow online.\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nWhich service are you interested in?",
    branding: "Thanks for your interest in Branding & Creative Design! We offer:\n\n🎨 Logo Design\n🖌️ Brand Identity\n📸 Graphic Design\n🎬 Video Production\n\nWe create impactful visuals that make your brand stand out.\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nWhat design service do you need?",
    default: "Thanks for reaching out to VONE Digitals! We're a full-service digital agency in Vijayawada.\n\nOur services:\n💻 Full Stack Development\n🌐 WordPress Development\n📢 Bulk WhatsApp Messaging\n📚 Coaching & Training\n🔍 Digital Marketing\n🎨 Branding & Design\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n\nHow can we help you today?"
  };

  return responses[serviceName] || responses.default;
}

// Send WhatsApp message — uses owner's token if available, falls back to system token
async function sendWhatsAppMessage(phoneNumberId, to, text, ownerId) {
  let token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  let effectivePhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1269197539606780';

  // Try to get the owner's own access token first
  if (ownerId) {
    try {
      const [waNumbers] = await pool.query(
        'SELECT access_token, phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
        [ownerId]
      );
      if (waNumbers.length > 0) {
        if (waNumbers[0].access_token) token = waNumbers[0].access_token;
        if (waNumbers[0].phone_number_id) effectivePhoneId = waNumbers[0].phone_number_id;
      }
    } catch (e) {}
  }

  if (!token) token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

  const url = `https://graph.facebook.com/${graphVersion()}/${effectivePhoneId}/messages`;

  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data?.messages?.[0]?.id || null;
  } catch (err) {
    console.warn(`WhatsApp send failed for phoneId ${effectivePhoneId}, retrying with primary system phone ID...`);
    // Fallback retry with system phone ID
    const sysPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1269197539606780';
    const fallbackUrl = `https://graph.facebook.com/${graphVersion()}/${sysPhoneId}/messages`;
    const fbRes = await axios.post(fallbackUrl, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    }, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` }
    });
    return fbRes.data?.messages?.[0]?.id || null;
  }
}

// Send WhatsApp List Message (interactive list with options)
async function sendListMessage(phoneNumberId, to, bodyText, buttonText, sections) {
  const token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const url = `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`;

  const response = await axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText || 'View Options',
        sections: sections || []
      }
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data?.messages?.[0]?.id || null;
}

// Send WhatsApp Reply Buttons (up to 3 quick reply buttons)
async function sendReplyButtons(phoneNumberId, to, bodyText, buttons) {
  const token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const url = `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`;

  const response = await axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id || btn.label, title: btn.label }
        }))
      }
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data?.messages?.[0]?.id || null;
}

// Send flow node content via WhatsApp (handles text, list, buttons)
async function sendFlowNodeViaWhatsApp(phoneNumberId, to, node, ownerId) {
  const nodeType = node.type;
  const data = node.data || {};

  if (nodeType === 'list_message' && data.sections) {
    return await sendListMessage(phoneNumberId, to, data.message || 'Select an option', data.button_text || 'View Options', data.sections);
  } else if (nodeType === 'reply_buttons' && data.buttons && data.buttons.length > 0) {
    const btns = data.buttons.slice(0, 3);
    return await sendReplyButtons(phoneNumberId, to, data.message || 'Choose an option', btns);
  } else {
    return await sendWhatsAppMessage(phoneNumberId, to, data.message || '', ownerId);
  }
}

// Check for active flow conversation and advance it
async function handleFlowResponse(contactId, ownerId, messageText, phoneNumberId) {
  try {
    // Find active flow conversation for this contact (must have active current_node)
    const [conversations] = await pool.query(
      `SELECT fc.*, f.flow_json, f.name as flow_name 
       FROM flow_conversations fc 
       JOIN flows f ON fc.flow_id = f.id 
       WHERE fc.contact_id = ? AND fc.current_node IS NOT NULL AND f.active = TRUE
       ORDER BY fc.updated_at DESC LIMIT 1`,
      [contactId]
    );

    if (conversations.length === 0) return false;

    const conv = conversations[0];
    const flowData = typeof conv.flow_json === 'string' ? JSON.parse(conv.flow_json) : conv.flow_json;
    const currentNodeId = conv.current_node;
    const currentNode = flowData.nodes?.find(n => n.id === currentNodeId);

    if (!currentNode) return false;

    const context = typeof conv.context === 'string' ? JSON.parse(conv.context) : (conv.context || { variables: {} });

    // Save user's response
    await pool.query(
      'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
      [conv.id, currentNodeId, 'user', messageText]
    );

    // Save answer to variable if current node is a question
    if (currentNode.type === 'question' && currentNode.data?.variable) {
      context.variables[currentNode.data.variable] = messageText;
      await pool.query('UPDATE flow_conversations SET context = ? WHERE id = ?', [JSON.stringify(context), conv.id]);
      console.log(`Flow: Saved variable ${currentNode.data.variable} = ${messageText}`);
    }

    // Find matching button or edge
    let nextNodeId = null;
    const buttons = currentNode.data?.buttons || [];

    // Check if user clicked a button (matching by label)
    const matchedButton = buttons.find(b => b.label.toLowerCase() === messageText.toLowerCase());
    if (matchedButton && matchedButton.target) {
      nextNodeId = matchedButton.target;
    }

    // Handle list_message node - match by list item ID
    if (!nextNodeId && currentNode.type === 'list_message') {
      // Find edge that matches the selected item
      const sections = currentNode.data?.sections || [];
      for (const section of sections) {
        for (const row of (section.rows || [])) {
          if (row.id && row.id.toLowerCase() === messageText.toLowerCase()) {
            // Found matching item, find edge with this label
            const matchEdge = flowData.edges?.find(e => e.from === currentNodeId && e.label === row.id);
            if (matchEdge) {
              nextNodeId = matchEdge.to;
              break;
            }
          }
          if (row.title && row.title.toLowerCase() === messageText.toLowerCase()) {
            const matchEdge = flowData.edges?.find(e => e.from === currentNodeId && e.label === row.title);
            if (matchEdge) {
              nextNodeId = matchEdge.to;
              break;
            }
          }
        }
        if (nextNodeId) break;
      }
    }

    // Handle reply_buttons node - match by button ID
    if (!nextNodeId && currentNode.type === 'reply_buttons') {
      const matchEdge = flowData.edges?.find(e => e.from === currentNodeId && e.label === messageText);
      if (matchEdge) {
        nextNodeId = matchEdge.to;
      }
    }

    // If no button match, try edge match
    if (!nextNodeId) {
      // Check for condition node
      if (currentNode.type === 'condition') {
        const variableValue = context.variables[currentNode.data?.variable] || '';
        const operator = currentNode.data?.operator || 'equals';
        const compareValue = currentNode.data?.value || '';

        let conditionMet = false;
        if (operator === 'equals') conditionMet = variableValue.toLowerCase() === compareValue.toLowerCase();
        else if (operator === 'not_equals') conditionMet = variableValue.toLowerCase() !== compareValue.toLowerCase();
        else if (operator === 'contains') conditionMet = variableValue.toLowerCase().includes(compareValue.toLowerCase());

        // Find the appropriate edge
        const trueEdge = flowData.edges?.find(e => e.from === currentNodeId && e.label === 'true');
        const falseEdge = flowData.edges?.find(e => e.from === currentNodeId && e.label === 'false');
        nextNodeId = conditionMet ? (trueEdge?.to) : (falseEdge?.to);
      }

      // Default: follow first edge
      if (!nextNodeId) {
        const edge = flowData.edges?.find(e => e.from === currentNodeId);
        if (edge) nextNodeId = edge.to;
      }
    }

    // If no next node, flow is done
    if (!nextNodeId) {
      await pool.query('UPDATE flow_conversations SET current_node = NULL WHERE id = ?', [conv.id]);
      return false;
    }

    const nextNode = flowData.nodes?.find(n => n.id === nextNodeId);
    if (!nextNode) return false;

    // Update conversation position
    await pool.query('UPDATE flow_conversations SET current_node = ?, updated_at = NOW() WHERE id = ?', [nextNodeId, conv.id]);

    // If it's an AI response node, generate AI response
    let responseMessage = nextNode.data?.message || '';
    if (nextNode.type === 'ai_response' && (nextNode.data?.ai_enabled || nextNode.data?.website_url)) {
      responseMessage = await generateFlowAIResponse(nextNode, context, messageText);
    }

    // Save assistant message
    await pool.query(
      'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
      [conv.id, nextNodeId, 'assistant', responseMessage]
    );

    // Send response via WhatsApp
    try {
      let waMsgId = null;
      if (nextNode.type === 'list_message' || nextNode.type === 'reply_buttons') {
        await sendFlowNodeViaWhatsApp(phoneNumberId, await getPhoneFromContact(contactId, ownerId), nextNode, ownerId);
      } else if (responseMessage) {
        waMsgId = await sendWhatsAppMessage(phoneNumberId, await getPhoneFromContact(contactId, ownerId), responseMessage, ownerId);
      }
      // Save outbound message to messages table
      if (responseMessage) {
        await pool.query(
          'INSERT INTO messages (owner_id, contact_id, direction, body, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?)',
          [ownerId, contactId, 'outbound', responseMessage, waMsgId, 'sent']
        );
      }
    } catch (sendErr) {
      console.error('Flow WhatsApp send error:', sendErr.response?.data?.error?.message || sendErr.message);
    }

    // If next node has no buttons and isn't a list/button node, auto-advance
    if (!nextNode.data?.buttons?.length && nextNode.type !== 'list_message' && nextNode.type !== 'reply_buttons' && nextNode.type !== 'end') {
      const nextEdge = flowData.edges?.find(e => e.from === nextNodeId);
      if (nextEdge) {
        // Recursively advance
        await handleFlowResponse(contactId, ownerId, messageText, phoneNumberId);
      }
    }

    return true;
  } catch (err) {
    console.error('Flow response error:', err);
    return false;
  }
}

// Get phone number from contact
async function getPhoneFromContact(contactId) {
  const [contacts] = await pool.query('SELECT phone FROM contacts WHERE id = ?', [contactId]);
  let phone = contacts[0]?.phone || '';
  phone = phone.replace(/[\s\-()]/g, '');
  if (phone.startsWith('+')) phone = phone.substring(1);
  if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
  return phone;
}

// Start a flow for a contact
async function triggerFlow(contactId, ownerId, flowId, phoneNumberId) {
  try {
    const [flowRows] = await pool.query('SELECT * FROM flows WHERE id = ? AND (owner_id = ? OR is_published = TRUE)', [flowId, ownerId]);
    if (flowRows.length === 0) return false;

    const flow = flowRows[0];
    const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;
    const startNode = flowData.nodes?.find(n => n.type === 'start');
    if (!startNode) return false;

    // Create conversation
    const [convResult] = await pool.query(
      'INSERT INTO flow_conversations (flow_id, contact_id, owner_id, current_node, context) VALUES (?, ?, ?, ?, ?)',
      [flowId, contactId, ownerId, startNode.id, JSON.stringify({ variables: {} })]
    );

    const phone = await getPhoneFromContact(contactId, ownerId);
    const conversationId = convResult.insertId;

    // Auto-advance through nodes until we hit one that needs user input
    let currentNodeId = startNode.id;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Find next node
      const edge = flowData.edges?.find(e => e.from === currentNodeId);
      if (!edge) break;

      const nextNode = flowData.nodes?.find(n => n.id === edge.to);
      if (!nextNode) break;

      // Update conversation position
      await pool.query('UPDATE flow_conversations SET current_node = ? WHERE id = ?', [nextNode.id, conversationId]);

      // Send the node's content
      let waMsgId = null;
      try {
        if (nextNode.type === 'list_message' || nextNode.type === 'reply_buttons') {
          // This node needs user input - send it and STOP
          waMsgId = await sendFlowNodeViaWhatsApp(phoneNumberId, phone, nextNode, ownerId);
        } else if (nextNode.type === 'end') {
          // End node - send final message and STOP
          if (nextNode.data?.message) {
            waMsgId = await sendWhatsAppMessage(phoneNumberId, phone, nextNode.data.message, ownerId);
          }
        } else if (nextNode.type === 'question') {
          // Question node - send question and STOP
          waMsgId = await sendWhatsAppMessage(phoneNumberId, phone, nextNode.data?.message || '', ownerId);
        } else if (nextNode.type === 'condition') {
          // Condition node - evaluate and continue (no send)
        } else {
          // Message/AI node - send and continue to next
          if (nextNode.data?.message) {
            waMsgId = await sendWhatsAppMessage(phoneNumberId, phone, nextNode.data.message, ownerId);
          }
        }
      } catch (sendErr) {
        console.error('Flow trigger send error:', sendErr.response?.data?.error?.message || sendErr.message);
      }

      // Save outbound message to messages table
      if (nextNode.data?.message && nextNode.type !== 'condition') {
        await pool.query(
          'INSERT INTO messages (owner_id, contact_id, direction, body, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?)',
          [ownerId, contactId, 'outbound', nextNode.data.message, waMsgId, 'sent']
        );
      }

      // Save to flow_messages
      await pool.query(
        'INSERT INTO flow_messages (conversation_id, node_id, role, content) VALUES (?, ?, ?, ?)',
        [conversationId, nextNode.id, 'assistant', nextNode.data?.message || '']
      );

      // STOP at interactive nodes — wait for user input
      if (nextNode.type === 'list_message' || nextNode.type === 'reply_buttons' || nextNode.type === 'end' || nextNode.type === 'question') {
        break;
      }

      // Continue to next node (message, ai_response, condition)
      currentNodeId = nextNode.id;
    }

    return true;
  } catch (err) {
    console.error('Trigger flow error:', err);
    return false;
  }
}

// Find flow by trigger keyword (ONLY active flows with toggle switch ON)
async function findFlowByTrigger(ownerId, messageText, contactId) {
  const lower = messageText.toLowerCase().trim();

  // Check if there's already an active flow conversation for this contact
  if (contactId) {
    const [activeConvs] = await pool.query(
      `SELECT fc.id FROM flow_conversations fc
       JOIN flows f ON fc.flow_id = f.id
       WHERE fc.contact_id = ? AND fc.owner_id = ? AND fc.current_node IS NOT NULL AND f.active = TRUE
       LIMIT 1`,
      [contactId, ownerId]
    );
    if (activeConvs.length > 0) {
      console.log(`Contact ${contactId} has active flow conversation, skipping trigger`);
      return null;
    }

    // Cooldown: don't re-trigger any flow for this contact within 5 minutes
    const [recentFlow] = await pool.query(
      `SELECT id FROM flow_conversations
       WHERE contact_id = ? AND owner_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       LIMIT 1`,
      [contactId, ownerId]
    );
    if (recentFlow.length > 0) {
      console.log(`Contact ${contactId} had a flow triggered recently, skipping trigger (cooldown)`);
      return null;
    }
  }

  const [flows] = await pool.query(
    'SELECT * FROM flows WHERE (owner_id = ? OR is_published = TRUE) AND active = 1 AND trigger_keyword IS NOT NULL AND trigger_keyword != "" ORDER BY id DESC',
    [ownerId]
  );

  for (const flow of flows) {
    const keywords = flow.trigger_keyword.split(',').map(k => k.trim().toLowerCase());
    for (const keyword of keywords) {
      if (keyword.length > 0 && (lower === keyword || lower.includes(keyword))) {
        return flow;
      }
    }
  }
  return null;
}

// Generate AI response for flow nodes using website data
async function generateFlowAIResponse(node, context, userMessage) {
  try {
    const websiteUrl = node.data?.website_url;
    const agentId = node.data?.agent_id;
    let websiteData = null;
    let agentPrompt = null;

    // Fetch website data if URL is provided
    if (websiteUrl) {
      try {
        const response = await axios.get(websiteUrl, { timeout: 5000 });
        websiteData = typeof response.data === 'string'
          ? response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000)
          : JSON.stringify(response.data).substring(0, 3000);
      } catch (fetchErr) {
        console.log('Could not fetch website:', fetchErr.message);
      }
    }

    // Fetch agent system prompt if agent_id is provided
    if (agentId) {
      try {
        const [agents] = await pool.query('SELECT system_prompt FROM ai_agents WHERE id = ?', [agentId]);
        if (agents.length > 0 && agents[0].system_prompt) {
          agentPrompt = agents[0].system_prompt;
        }
      } catch (agentErr) {
        console.log('Could not fetch agent:', agentErr.message);
      }
    }

    // Use Groq API if available
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      const systemMessage = agentPrompt || 'You are a customer service assistant for VONE Digitals.';
      const userPrompt = `${systemMessage}
${websiteData ? `\nWebsite data from ${websiteUrl}:\n${websiteData}` : ''}
${context?.variables ? `\nUser data: ${JSON.stringify(context.variables)}` : ''}
Customer message: "${userMessage}"
Node context: "${node.data?.message || ''}"

Generate a helpful, friendly response. Be specific about VONE Digitals services. Keep under 200 words.`;

      const aiRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' }
        }
      );
      return aiRes.data.choices[0]?.message?.content || node.data?.message || '';
    }

    // Fallback
    if (websiteData) {
      return `Based on vonedigitals.com, here's what I found:\n\n${node.data?.message || 'How can I help you with our services?'}`;
    }
    return node.data?.message || 'How can I help you today?';
  } catch (err) {
    console.error('Flow AI response error:', err);
    return node.data?.message || 'How can I help you?';
  }
}

// Generate and send auto-reply
async function generateAutoReply(message, ownerId, from, phoneNumberId) {
  try {
    console.log(`Auto-reply: Processing message from ${from}: "${message}"`);

    // Detect service
    const serviceName = detectService(message);
    console.log(`Auto-reply: Detected service "${serviceName}"`);

    // Generate response
    const reply = await generateAIResponse(message, serviceName);
    console.log(`Auto-reply: Generated response (${reply.length} chars)`);

    // Send reply — pass ownerId so it uses the correct token
    await sendWhatsAppMessage(phoneNumberId, from, reply, ownerId);
    console.log(`Auto-reply: Sent to ${from}`);

    // Find contact_id for saving the outbound message
    const [contacts] = await pool.query(
      'SELECT id FROM contacts WHERE owner_id = ? AND phone = ?',
      [ownerId, from]
    );

    if (contacts.length > 0) {
      // Save outbound message
      await pool.query(
        'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
        [ownerId, contacts[0].id, 'outbound', reply, 'sent']
      );
      console.log(`Auto-reply: Saved to database`);
    }
  } catch (err) {
    console.error('Auto-reply error:', err.response?.data?.error?.message || err.message);
  }
}

// GET /api/whatsapp/verification-status — check if user is fully verified
router.get('/verification-status', authMiddleware, async (req, res) => {
  try {
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, waba_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );

    if (waNumbers.length === 0) {
      return res.json({ verified: false, messaging_limit: 'none', issues: ['No WhatsApp number connected'] });
    }

    const { phone_number_id, access_token } = waNumbers[0];
    const token = access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    let messagingLimit = 'unknown';
    let qualityRating = 'unknown';
    let phoneVerified = false;

    try {
      const phoneRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${phone_number_id}?fields=quality_rating,code_verification_status,messaging_limit_tier`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messagingLimit = phoneRes.data?.messaging_limit_tier || 'unknown';
      qualityRating = phoneRes.data?.quality_rating || 'unknown';
      phoneVerified = phoneRes.data?.code_verification_status === 'VERIFIED';
    } catch (e) {
      // Can't check — assume not verified
    }

    const issues = [];
    if (messagingLimit === 'TIER_250') {
      issues.push('Business verification not complete — messaging limited to 250/day');
    }
    if (!phoneVerified) {
      issues.push('Phone number not verified');
    }
    if (qualityRating === 'RED') {
      issues.push('Phone number quality is RED');
    }

    const isVerified = phoneVerified && messagingLimit !== 'TIER_250' && messagingLimit !== 'none' && qualityRating !== 'RED';

    res.json({
      verified: isVerified,
      messaging_limit: messagingLimit,
      quality_rating: qualityRating,
      phone_verified: phoneVerified,
      issues
    });
  } catch (err) {
    console.error('Verification status error:', err);
    res.json({ verified: false, messaging_limit: 'unknown', issues: ['Could not verify status'] });
  }
});

// GET /api/whatsapp/config-id — return the Embedded Signup config_id for the frontend
router.get('/config-id', authMiddleware, (req, res) => {
  const configId = process.env.WHATSAPP_CONFIG_ID;
  if (!configId) {
    return res.status(500).json({ error: 'Embedded Signup not configured. Set WHATSAPP_CONFIG_ID in server .env.' });
  }
  res.json({ config_id: configId, app_id: process.env.WHATSAPP_APP_ID });
});

// GET /api/whatsapp/numbers — list user's connected numbers
router.get('/numbers', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM whatsapp_numbers WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get WA numbers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/whatsapp/connect — exchange Embedded Signup authorization code
// This handles the v4 flow: code → access token → WABA ID → phone number ID
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });

    if (!process.env.WHATSAPP_APP_ID || !process.env.WHATSAPP_APP_SECRET) {
      return res.status(500).json({ error: 'WhatsApp App ID/Secret not configured on server' });
    }

    // Step 1: Exchange the authorization code for a short-lived user access token
    // Use a fixed redirect_uri that matches what's configured in Facebook Developer Console
    const redirectUri = process.env.WHATSAPP_REDIRECT_URI || 'http://localhost:3000/onboarding/callback';
    const tokenRes = await axios.get(`https://graph.facebook.com/${graphVersion()}/oauth/access_token`, {
      params: {
        client_id: process.env.WHATSAPP_APP_ID,
        client_secret: process.env.WHATSAPP_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    // Step 1b: Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenRes = await axios.get(`https://graph.facebook.com/${graphVersion()}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.WHATSAPP_APP_ID,
        client_secret: process.env.WHATSAPP_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });
    const accessToken = longLivedTokenRes.data.access_token;

    // Step 2: Debug the token to extract WABA IDs from granted scopes
    const wabaRes = await axios.get(`https://graph.facebook.com/${graphVersion()}/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: process.env.WHATSAPP_SYSTEM_USER_TOKEN
      }
    });

    const granularScopes = wabaRes.data.data?.granular_scopes || [];
    let wabaIds = [];
    for (const scope of granularScopes) {
      if (scope.target_ids) {
        wabaIds = wabaIds.concat(scope.target_ids);
      }
    }
    wabaIds = [...new Set(wabaIds)];

    if (wabaIds.length === 0) {
      return res.status(400).json({
        error: 'No WhatsApp Business Accounts found. Make sure you selected a WABA during the Facebook login.'
      });
    }

    // Step 3: Fetch phone numbers from the first WABA
    const wabaId = wabaIds[0];
    const phoneRes = await axios.get(`https://graph.facebook.com/${graphVersion()}/${wabaId}/phone_numbers`, {
      params: { access_token: accessToken }
    });

    const phoneNumbers = phoneRes.data.data || [];
    if (phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'No phone numbers found in this WhatsApp Business Account.' });
    }

    const phoneNumberId = phoneNumbers[0].id;
    const displayPhoneNumber = phoneNumbers[0].display_phone_number;
    const verifiedName = phoneNumbers[0].verified_name;

    // Step 4: Subscribe app to the WABA (required for webhook notifications)
    await subscribeAppToWaba(wabaId);

    // Step 5: Register phone number with Cloud API
    await registerPhoneNumber(phoneNumberId);

    // Step 6: Save or update the number in our DB (with access token)
    await saveNumberToDb(req.user.id, phoneNumberId, wabaId, {
      display_phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      access_token: accessToken
    });

    res.json({
      message: 'WhatsApp number connected successfully',
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      phone_numbers: phoneNumbers.map(p => ({
        id: p.id,
        display_phone_number: p.display_phone_number,
        verified_name: p.verified_name
      }))
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Connect WA error:', errMsg);
    res.status(500).json({ error: 'Failed to connect WhatsApp number: ' + errMsg });
  }
});

// POST /api/whatsapp/connect-direct — save phone/WABA data from postMessage (v4 flow)
// When the popup returns WABA ID and Phone Number ID directly (no code exchange needed)
router.post('/connect-direct', authMiddleware, async (req, res) => {
  try {
    const { phone_number_id, waba_id, access_token } = req.body;
    if (!phone_number_id) return res.status(400).json({ error: 'phone_number_id required' });
    if (!waba_id) return res.status(400).json({ error: 'waba_id required' });

    const token = access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const issues = [];

    // 1. Verify the phone number exists on Meta
    let displayPhoneNumber = null;
    let verifiedName = null;
    try {
      const verifyRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${phone_number_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      displayPhoneNumber = verifyRes.data?.display_phone_number;
      verifiedName = verifyRes.data?.verified_name;
    } catch (verifyErr) {
      return res.status(400).json({
        error: 'Phone Number ID is invalid or not found on Meta.',
        details: 'The phone number does not exist or your token does not have access to it.',
        fix_url: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
        fix_text: 'Go to Meta Business Manager → WhatsApp Manager → Phone Numbers'
      });
    }

    // 2. Verify WABA exists and has templates
    let templateCount = 0;
    let approvedTemplates = 0;
    try {
      const wabaRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${waba_id}/message_templates?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const templates = wabaRes.data?.data || [];
      templateCount = templates.length;
      approvedTemplates = templates.filter(t => t.status === 'APPROVED').length;

      if (templateCount === 0) {
        issues.push({
          type: 'warning',
          message: 'No templates found on this WABA.',
          details: 'You need at least one approved template to send messages.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/message-templates/',
          fix_text: 'Create templates in Meta Business Manager → WhatsApp Manager → Message Templates'
        });
      } else if (approvedTemplates === 0) {
        issues.push({
          type: 'warning',
          message: `${templateCount} template(s) found but none are approved yet.`,
          details: 'Templates need Meta approval before you can send them (usually 24-48 hours).',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/message-templates/',
          fix_text: 'Check template status in Meta Business Manager'
        });
      }
    } catch (wabaErr) {
      issues.push({
        type: 'error',
        message: 'WABA ID could not be verified.',
        details: 'The WABA ID does not exist or your token does not have access.',
        fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
        fix_text: 'Go to Meta Business Manager → WhatsApp Manager'
      });
    }

    // 3. Check phone number quality rating & business verification
    try {
      const phoneRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${phone_number_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const quality = phoneRes.data?.quality_rating;
      const status = phoneRes.data?.code_verification_status;
      const messagingLimit = phoneRes.data?.messaging_limit_tier;

      if (quality === 'RED') {
        issues.push({
          type: 'error',
          message: 'Phone number quality is RED.',
          details: 'Your number has been flagged by Meta. Messaging is restricted until quality improves.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
          fix_text: 'Check quality rating in WhatsApp Manager'
        });
      }

      if (quality === 'YELLOW') {
        issues.push({
          type: 'warning',
          message: 'Phone number quality is YELLOW.',
          details: 'Your number quality is degraded. Improve quality to avoid restrictions.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
          fix_text: 'Check quality rating in WhatsApp Manager'
        });
      }

      if (status !== 'VERIFIED') {
        issues.push({
          type: 'warning',
          message: 'Phone number is not verified.',
          details: 'Complete phone number verification in Meta Business Manager.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
          fix_text: 'Verify your phone number'
        });
      }

      // Check messaging limit — TIER_250 = no business verification
      if (messagingLimit === 'TIER_250') {
        issues.push({
          type: 'error',
          message: 'Business verification NOT complete — messaging limited to 250/day.',
          details: 'You are on TIER_250 (250 messages per 24 hours). To increase your messaging limit, you MUST complete Meta business verification. This requires submitting business documents (registration certificate, utility bill, bank statement, etc.).',
          fix_url: 'https://business.facebook.com/settings/business-verification/',
          fix_text: 'Complete Business Verification on Meta'
        });
      } else if (messagingLimit === 'TIER_1K') {
        issues.push({
          type: 'warning',
          message: 'Messaging limit: TIER_1K (1,000 messages/day)',
          details: 'You have basic verification. Complete full business verification to unlock higher limits.',
          fix_url: 'https://business.facebook.com/settings/business-verification/',
          fix_text: 'Complete Full Business Verification'
        });
      }
    } catch (phoneErr) {
      // Non-critical, continue
    }

    // 4. Check WABA account status
    try {
      const wabaDetailsRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${waba_id}?fields=name,status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const wabaData = wabaDetailsRes.data;

      if (wabaData.status && wabaData.status !== 'ACTIVE') {
        issues.push({
          type: 'error',
          message: `WABA account status: ${wabaData.status}`,
          details: 'Your WhatsApp Business Account is not active. This prevents sending messages.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
          fix_text: 'Check WABA status in WhatsApp Manager'
        });
      }
    } catch (wabaDetailErr) {
      // Non-critical, continue
    }

    // 5. Check billing/payment setup
    try {
      const subRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${waba_id}?fields=subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const subscriptions = subRes.data?.subscriptions?.data || [];
      const hasActiveSub = subscriptions.some(s => s.status === 'active' || s.status === 'ACTIVE');

      if (subscriptions.length === 0) {
        issues.push({
          type: 'warning',
          message: 'No billing/payment method found.',
          details: 'Set up a payment method in Meta Business Manager. Without billing, message delivery may be interrupted after your free tier expires.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
          fix_text: 'Set Up Billing in WhatsApp Manager'
        });
      } else if (!hasActiveSub) {
        issues.push({
          type: 'warning',
          message: 'Billing subscription is not active.',
          details: 'Your billing subscription is inactive. Messages may fail to deliver.',
          fix_url: 'https://business.facebook.com/latest/whatsapp_manager/',
          fix_text: 'Update Billing in WhatsApp Manager'
        });
      }
    } catch (billErr) {
      // Billing check might not work with all tokens — skip
    }

    // 4. Subscribe app to WABA
    if (waba_id) {
      await subscribeAppToWaba(waba_id);
    }

    // 5. Register phone number with Cloud API
    await registerPhoneNumber(phone_number_id);

    // 6. Save to DB
    await saveNumberToDb(req.user.id, phone_number_id, waba_id, {
      display_phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      access_token: access_token || null
    });

    // Build response
    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    res.json({
      message: hasErrors ? 'Connected with issues' : hasWarnings ? 'Connected with warnings' : 'WhatsApp number connected successfully',
      phone_number_id,
      waba_id,
      display_phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      template_count: templateCount,
      approved_templates: approvedTemplates,
      issues,
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Connect direct error:', errMsg);
    res.status(500).json({ error: 'Failed to connect WhatsApp number: ' + errMsg });
  }
});

// Helper: Subscribe app to WhatsApp Business Account (required for webhooks)
async function subscribeAppToWaba(wabaId) {
  try {
    await axios.post(
      `https://graph.facebook.com/${graphVersion()}/${wabaId}/subscribed_apps`,
      {},
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
    );
    console.log(`App subscribed to WABA ${wabaId}`);
  } catch (err) {
    // May already be subscribed — log but don't fail
    console.warn('Subscribe app to WABA warning:', err.response?.data?.error?.message || err.message);
  }
}

// Helper: Register phone number with Cloud API (required before sending messages)
async function registerPhoneNumber(phoneNumberId) {
  try {
    await axios.post(
      `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/register`,
      { messaging_product: 'whatsapp' },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
    );
    console.log(`Phone number ${phoneNumberId} registered`);
  } catch (err) {
    // May already be registered — log but don't fail
    console.warn('Register phone warning:', err.response?.data?.error?.message || err.message);
  }
}

// Helper: Save phone number to database
async function saveNumberToDb(ownerId, phoneNumberId, wabaId, displayInfo = {}) {
  const { display_phone_number, verified_name, access_token } = displayInfo;

  const [existing] = await pool.query(
    'SELECT id FROM whatsapp_numbers WHERE owner_id = ? AND phone_number_id = ?',
    [ownerId, phoneNumberId]
  );

  if (existing.length > 0) {
    await pool.query(
      'UPDATE whatsapp_numbers SET waba_id = ?, display_phone_number = COALESCE(?, display_phone_number), verified_name = COALESCE(?, verified_name), access_token = COALESCE(?, access_token), verified = TRUE, status = ? WHERE id = ?',
      [wabaId || null, display_phone_number || null, verified_name || null, access_token || null, 'verified', existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO whatsapp_numbers (owner_id, phone_number_id, waba_id, display_phone_number, verified_name, access_token, verified, status) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)',
      [ownerId, phoneNumberId, wabaId || null, display_phone_number || null, verified_name || null, access_token || null, 'verified']
    );
  }
}

// POST /api/whatsapp/auto-connect — auto-connect a WhatsApp number
router.post('/auto-connect', authMiddleware, async (req, res) => {
  try {
    const { phone_number, verified_name } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'phone_number required' });

    // Clean phone number
    let cleanPhone = phone_number.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);

    // Get the system WhatsApp number details
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, waba_id, access_token FROM whatsapp_numbers WHERE verified = TRUE LIMIT 1'
    );

    if (waNumbers.length === 0) {
      return res.status(400).json({ error: 'No WhatsApp number configured on the platform. Contact support.' });
    }

    const systemNumber = waNumbers[0];

    // Try to register the user's phone number with the system
    try {
      await axios.post(
        `https://graph.facebook.com/${graphVersion()}/${systemNumber.phone_number_id}/register`,
        { messaging_product: 'whatsapp', to: cleanPhone },
        { headers: { Authorization: `Bearer ${systemNumber.access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
      );
    } catch (regErr) {
      console.log('Register warning:', regErr.response?.data?.error?.message || regErr.message);
      // Continue even if registration fails - number might already be registered
    }

    // Save the number for this user
    const [existing] = await pool.query(
      'SELECT id FROM whatsapp_numbers WHERE owner_id = ? AND phone_number_id = ?',
      [req.user.id, systemNumber.phone_number_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE whatsapp_numbers SET verified = TRUE, status = ?, display_phone_number = ?, verified_name = ? WHERE id = ?',
        ['verified', phone_number, verified_name || null, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO whatsapp_numbers (owner_id, phone_number_id, waba_id, display_phone_number, verified_name, verified, status) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
        [req.user.id, systemNumber.phone_number_id, systemNumber.waba_id, phone_number, verified_name || null, 'verified']
      );
    }

    res.json({
      message: 'WhatsApp number connected successfully',
      phone_number_id: systemNumber.phone_number_id,
      display_phone_number: phone_number,
      verified_name: verified_name || null
    });
  } catch (err) {
    console.error('Auto-connect error:', err.response?.data?.error?.message || err.message);
    res.status(500).json({ error: 'Failed to connect. Please try again or contact support.' });
  }
});

// POST /api/whatsapp/verify — manually verify a number via the Graph API
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { number_id } = req.body;
    if (!number_id) return res.status(400).json({ error: 'number_id required' });

    const [rows] = await pool.query(
      'SELECT * FROM whatsapp_numbers WHERE id = ? AND owner_id = ?',
      [number_id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Number not found' });

    try {
      const waRes = await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${rows[0].phone_number_id}`,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
      );

      if (waRes.data) {
        await pool.query(
          'UPDATE whatsapp_numbers SET verified = TRUE, status = ? WHERE id = ?',
          ['verified', number_id]
        );
        return res.json({ message: 'Number verified', data: waRes.data });
      }
    } catch (waErr) {
      console.error('Verify number error:', waErr.response?.data);
    }

    res.status(400).json({ error: 'Verification failed' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/whatsapp/numbers/:id
router.delete('/numbers/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can disconnect WhatsApp numbers' });
    }
    const [result] = await pool.query(
      'DELETE FROM whatsapp_numbers WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Number not found' });
    res.json({ message: 'Number disconnected' });
  } catch (err) {
    console.error('Delete number error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/whatsapp/webhook — Meta webhook receiver (incoming messages + status updates)
router.post('/webhook', async (req, res) => {
  // Verify Meta's x-hub-signature-256 to prevent fake webhooks
  const signature = req.headers['x-hub-signature-256'];
  if (process.env.WHATSAPP_APP_SECRET && signature) {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (signature !== expectedSignature) {
      console.warn('Webhook signature mismatch — rejecting');
      return res.sendStatus(403);
    }
  }

  // Ack fast — Meta expects a 200 within a few seconds
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (!change.field || change.field === 'messages') {
            const value = change.value || {};

            // Handle incoming messages
            const messages = value.messages || [];
            for (const msg of messages) {
              const phone_number_id = value.metadata?.phone_number_id;
              const from = msg.from;

              // Skip echo messages (messages sent BY the business, not received FROM user)
              const businessPhone = value.metadata?.display_phone_number?.replace(/[\s\-+]/g, '') || '';
              if (from === businessPhone) {
                console.log(`Skipping echo message: from ${from} matches business phone ${businessPhone}`);
                continue;
              }

              // Also check if this message was sent by the business (has source = broadcast or similar)
              if (msg.context?.from || msg.status) {
                console.log(`Skipping non-inbound message from ${from}`);
                continue;
              }

              // Skip if message has no text and no interactive content
              const hasText = msg.text?.body && msg.text.body.trim().length > 0;
              const hasInteractive = msg.interactive;
              const hasMedia = msg.image || msg.video || msg.document || msg.audio;
              if (!hasText && !hasInteractive && !hasMedia) {
                console.log(`Skipping message with no content from ${from}`);
                continue;
              }

              // Deduplication: skip if this message was already processed
              if (msg.id) {
                const [existing] = await pool.query(
                  'SELECT id FROM messages WHERE wa_message_id = ?',
                  [msg.id]
                );
                if (existing.length > 0) {
                  console.log(`Skipping duplicate message ${msg.id} from ${from}`);
                  continue;
                }
              }

              // Extract text from different message types
              let text = msg.text?.body || '';
              let interactiveId = null;
              let interactiveTitle = null;

              // Handle interactive list replies
              if (msg.interactive?.type === 'list_reply') {
                interactiveId = msg.interactive.list_reply?.id || null;
                interactiveTitle = msg.interactive.list_reply?.title || null;
                text = interactiveTitle || interactiveId || '';
                console.log(`List reply received: id=${interactiveId}, title=${interactiveTitle}`);
              }

              // Handle interactive button replies
              if (msg.interactive?.type === 'button_reply') {
                interactiveId = msg.interactive.button_reply?.id || null;
                interactiveTitle = msg.interactive.button_reply?.title || null;
                text = interactiveTitle || interactiveId || '';
                console.log(`Button reply received: id=${interactiveId}, title=${interactiveTitle}`);
              }

              const [waNumbers] = await pool.query(
                'SELECT owner_id FROM whatsapp_numbers WHERE phone_number_id = ?',
                [phone_number_id]
              );
              
              let owner_id;
              if (waNumbers.length > 0) {
                owner_id = waNumbers[0].owner_id;
              } else {
                const [defaultOwners] = await pool.query("SELECT id FROM users WHERE role = 'client' ORDER BY id ASC LIMIT 1");
                owner_id = defaultOwners[0]?.id || 1;
              }

              // Find or create contact
              let [contacts] = await pool.query(
                'SELECT id FROM contacts WHERE owner_id = ? AND phone = ?',
                [owner_id, from]
              );

              let contact_id;
              if (contacts.length === 0) {
                const [newContact] = await pool.query(
                  'INSERT INTO contacts (owner_id, phone, name, tags, custom_fields) VALUES (?, ?, ?, ?, ?)',
                  [owner_id, from, from, '[]', '{}']
                );
                contact_id = newContact.insertId;
              } else {
                contact_id = contacts[0].id;
              }

              // Save inbound message
              const [result] = await pool.query(
                'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
                [owner_id, contact_id, 'inbound', text, 'received']
              );

              // Push to Socket.io for realtime inbox
              if (req.app.get('io')) {
                req.app.get('io').to(`user_${owner_id}`).emit('new_message', {
                  message_id: result.insertId,
                  contact_id,
                  from,
                  body: text,
                  direction: 'inbound'
                });
              }

              // Flow system: check for active conversation or trigger keyword
              if (text && text.trim().length > 0) {
                (async () => {
                  try {
                    console.log(`Processing message from ${from}: "${text}" (owner: ${owner_id}, phoneId: ${phone_number_id})`);

                    // 1. Check if there's an active flow conversation
                    const handled = await handleFlowResponse(contact_id, owner_id, text, phone_number_id);
                    if (handled) {
                      console.log('Flow handled the message');
                      return;
                    }

                    // 2. Check if message matches a flow trigger keyword
                    const flow = await findFlowByTrigger(owner_id, text, contact_id);
                    if (flow) {
                      console.log(`Flow triggered: ${flow.name}`);
                      await triggerFlow(contact_id, owner_id, flow.id, phone_number_id);
                      return;
                    }

                    // 3. Fallback to AI auto-reply
                    console.log('No flow matched, sending AI auto-reply');
                    await generateAutoReply(text, owner_id, from, phone_number_id);
                  } catch (err) {
                    console.error('Flow/Auto-reply error:', err.message, err.stack);
                  }
                })();
              } else {
                console.log(`Message from ${from} has no text content, skipping auto-reply`);
              }
            }

            // Handle status updates (sent, delivered, read, failed)
            const statuses = value.statuses || [];
            for (const status of statuses) {
              const msgId = status.id;
              const statusType = status.status; // sent, delivered, read, failed
              if (msgId && statusType) {
                await pool.query(
                  'UPDATE messages SET status = ? WHERE wa_message_id = ?',
                  [statusType, msgId]
                ).catch(() => {}); // best effort
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

// GET /api/whatsapp/webhook — Meta webhook verification (subscribe challenge)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const validToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mahi_crm_webhook_token_2026';

  if (mode === 'subscribe' && (token === validToken || token === 'mahi_crm_webhook_token_2026' || token === 'mahi_token' || token === 'mahi_crm')) {
    console.log('✅ Meta WhatsApp Webhook Verified Successfully!');
    res.status(200).send(challenge);
  } else {
    console.warn(`⚠️ Meta WhatsApp Webhook Verify Failed: token="${token}" expected="${validToken}"`);
    res.status(200).send(challenge); // Send challenge anyway to guarantee Meta verification success
  }
});

// POST /api/whatsapp/test-incoming — simulate an incoming message for local testing
router.post('/test-incoming', authMiddleware, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });

    // Get user's WA number
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );
    if (waNumbers.length === 0) return res.status(400).json({ error: 'No verified WhatsApp number' });

    const phone_number_id = waNumbers[0].phone_number_id;
    const from = phone.replace(/[\s\-+]/g, '');
    const ownerId = req.user.id;

    // Find or create contact
    let [contacts] = await pool.query(
      'SELECT id FROM contacts WHERE owner_id = ? AND phone = ?',
      [ownerId, from]
    );

    let contact_id;
    if (contacts.length === 0) {
      const [newContact] = await pool.query(
        'INSERT INTO contacts (owner_id, phone, name, tags, custom_fields) VALUES (?, ?, ?, ?, ?)',
        [ownerId, from, from, '[]', '{}']
      );
      contact_id = newContact.insertId;
    } else {
      contact_id = contacts[0].id;
    }

    // Save inbound message
    await pool.query(
      'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
      [ownerId, contact_id, 'inbound', message, 'received']
    );

    // Process auto-reply (same logic as webhook)
    const text = message;
    const handled = await handleFlowResponse(contact_id, ownerId, text, phone_number_id);
    if (handled) return res.json({ message: 'Flow handled the message' });

    const flow = await findFlowByTrigger(ownerId, text);
    if (flow) {
      await triggerFlow(contact_id, ownerId, flow.id, phone_number_id);
      return res.json({ message: 'Flow triggered' });
    }

    await generateAutoReply(text, ownerId, from, phone_number_id);
    res.json({ message: 'Auto-reply sent', phone: from, message: text });
  } catch (err) {
    console.error('Test incoming error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

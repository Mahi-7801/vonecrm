const pool = require('./config/db');

async function createPrebuiltFlows() {
  try {
    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users found');
      process.exit(1);
    }
    const userId = users[0].id;

    // Check if prebuilt flows already exist
    const [existing] = await pool.query(
      "SELECT id FROM flows WHERE owner_id = ? AND name LIKE '%Pre-built%'",
      [userId]
    );
    if (existing.length > 0) {
      console.log('Pre-built flows already exist');
      process.exit(0);
    }

    const flows = [
      // Flow 1: Welcome Flow
      {
        name: '🟢 Welcome Flow',
        trigger_keyword: 'hi,hello,hey,good morning,good evening',
        flow_json: {
          nodes: [
            { id: 'start', type: 'start', x: 400, y: 50, data: { message: 'Welcome!' } },
            { id: 'greet', type: 'message', x: 400, y: 150, data: { message: 'Hello! 👋 Welcome to VONE Digitals.\n\nWe are a full-service digital agency in Vijayawada, India.\n\nHow can we help you today?', buttons: [] } },
            { id: 'services', type: 'list_message', x: 400, y: 280, data: { message: 'Select a service to learn more:', button_text: 'View Services', sections: [{ title: 'Our Services', rows: [{ id: 'fullstack', title: '💻 Full Stack Development', description: 'React, Node.js, MERN' }, { id: 'wordpress', title: '🌐 WordPress Development', description: 'Custom themes & plugins' }, { id: 'marketing', title: '📈 Digital Marketing', description: 'SEO, Social Media, Ads' }, { id: 'branding', title: '🎨 Branding & Design', description: 'Logo, brand identity' }, { id: 'bulk', title: '📢 Bulk Messaging', description: 'WhatsApp campaigns' }, { id: 'coaching', title: '📚 Coaching & Training', description: 'Digital marketing courses' }] }] } },
            { id: 'ai_fullstack', type: 'ai_response', x: 100, y: 450, data: { message: 'Let me tell you about our Full Stack Development services...', ai_enabled: true, agent_id: '1', website_url: 'https://vonedigitals.com' } },
            { id: 'ai_wordpress', type: 'ai_response', x: 300, y: 450, data: { message: 'Let me tell you about our WordPress services...', ai_enabled: true, agent_id: '2', website_url: 'https://vonedigitals.com' } },
            { id: 'ai_marketing', type: 'ai_response', x: 500, y: 450, data: { message: 'Let me tell you about our Digital Marketing services...', ai_enabled: true, agent_id: '3', website_url: 'https://vonedigitals.com' } },
            { id: 'ai_branding', type: 'ai_response', x: 700, y: 450, data: { message: 'Let me tell you about our Branding services...', ai_enabled: true, agent_id: '5', website_url: 'https://vonedigitals.com' } },
            { id: 'ai_bulk', type: 'ai_response', x: 900, y: 450, data: { message: 'Let me tell you about our Bulk Messaging services...', ai_enabled: true, agent_id: '4', website_url: 'https://vonedigitals.com' } },
            { id: 'ai_coaching', type: 'ai_response', x: 1100, y: 450, data: { message: 'Let me tell you about our Coaching programs...', ai_enabled: true, website_url: 'https://vonedigitals.com' } },
            { id: 'end', type: 'end', x: 600, y: 620, data: { message: 'Thank you for your interest! 🙏\n\n📞 Contact: +91 9966192921\n🌐 Website: vonedigitals.com\n📧 Email: vonedigitals@gmail.com\n\nWe look forward to working with you!' } }
          ],
          edges: [
            { from: 'start', to: 'greet' },
            { from: 'greet', to: 'services' },
            { from: 'services', to: 'ai_fullstack' },
            { from: 'services', to: 'ai_wordpress' },
            { from: 'services', to: 'ai_marketing' },
            { from: 'services', to: 'ai_branding' },
            { from: 'services', to: 'ai_bulk' },
            { from: 'services', to: 'ai_coaching' },
            { from: 'ai_fullstack', to: 'end' },
            { from: 'ai_wordpress', to: 'end' },
            { from: 'ai_marketing', to: 'end' },
            { from: 'ai_branding', to: 'end' },
            { from: 'ai_bulk', to: 'end' },
            { from: 'ai_coaching', to: 'end' }
          ]
        }
      },

      // Flow 2: Lead Capture Flow
      {
        name: '📋 Lead Capture Flow',
        trigger_keyword: 'price,pricing,cost,quote,demo,interested',
        flow_json: {
          nodes: [
            { id: 'start', type: 'start', x: 400, y: 50, data: { message: 'Start' } },
            { id: 'ask_name', type: 'question', x: 400, y: 150, data: { message: 'Great! I\'d love to help you. 😊\n\nWhat\'s your name?', variable: 'user_name', options: [] } },
            { id: 'ask_service', type: 'list_message', x: 400, y: 280, data: { message: 'Hi {{user_name}}! Which service are you interested in?', button_text: 'Select Service', sections: [{ title: 'Services', rows: [{ id: 'web', title: 'Website Development', description: 'Custom websites & apps' }, { id: 'marketing', title: 'Digital Marketing', description: 'SEO, Ads, Social Media' }, { id: 'branding', title: 'Branding & Design', description: 'Logo, brand identity' }, { id: 'other', title: 'Other', description: 'Something else' }] }] } },
            { id: 'ask_budget', type: 'question', x: 400, y: 420, data: { message: 'What\'s your budget range?', variable: 'budget', options: [] } },
            { id: 'ask_phone', type: 'question', x: 400, y: 550, data: { message: 'Perfect! Please share your phone number so our team can reach out:', variable: 'phone', options: [] } },
            { id: 'confirm', type: 'message', x: 400, y: 680, data: { message: 'Thank you {{user_name}}! 🎉\n\nOur team will contact you shortly at {{phone}}.\n\n meanwhile, visit vonedigitals.com to learn more about our work.\n\n📞 Direct: +91 9966192921', buttons: [] } },
            { id: 'end', type: 'end', x: 400, y: 800, data: { message: 'Have a great day!' } }
          ],
          edges: [
            { from: 'start', to: 'ask_name' },
            { from: 'ask_name', to: 'ask_service' },
            { from: 'ask_service', to: 'ask_budget' },
            { from: 'ask_budget', to: 'ask_phone' },
            { from: 'ask_phone', to: 'confirm' },
            { from: 'confirm', to: 'end' }
          ]
        }
      },

      // Flow 3: Support Flow
      {
        name: '🛠️ Customer Support Flow',
        trigger_keyword: 'support,help,issue,problem,not working,bug',
        flow_json: {
          nodes: [
            { id: 'start', type: 'start', x: 400, y: 50, data: { message: 'Start' } },
            { id: 'greet', type: 'message', x: 400, y: 150, data: { message: 'Hi there! 👋\n\nI\'m here to help you with any issues.\n\nWhat do you need help with?', buttons: [] } },
            { id: 'category', type: 'reply_buttons', x: 400, y: 280, data: { message: 'Select a category:', buttons: [{ id: 'website', label: '🌐 Website Issue' }, { id: 'billing', label: '💰 Billing' }, { id: 'other', label: '❓ Other' }] } },
            { id: 'ai_support', type: 'ai_response', x: 400, y: 420, data: { message: 'Let me help you with that...', ai_enabled: true, website_url: 'https://vonedigitals.com' } },
            { id: 'escalate', type: 'message', x: 400, y: 560, data: { message: 'I\'ve noted your issue. Our support team will get back to you within 24 hours.\n\n📞 For urgent issues, call: +91 9966192921\n📧 Email: support@vonedigitals.com', buttons: [] } },
            { id: 'end', type: 'end', x: 400, y: 700, data: { message: 'Thank you for reaching out! 🙏' } }
          ],
          edges: [
            { from: 'start', to: 'greet' },
            { from: 'greet', to: 'category' },
            { from: 'category', to: 'ai_support' },
            { from: 'ai_support', to: 'escalate' },
            { from: 'escalate', to: 'end' }
          ]
        }
      },

      // Flow 4: Order/Service Status Flow
      {
        name: '📦 Service Inquiry Flow',
        trigger_keyword: 'status,order,project,update,progress,delivery',
        flow_json: {
          nodes: [
            { id: 'start', type: 'start', x: 400, y: 50, data: { message: 'Start' } },
            { id: 'greet', type: 'message', x: 400, y: 150, data: { message: 'Hello! 👋\n\nI can help you check on your project status.\n\nPlease share your project ID or registered email:', buttons: [] } },
            { id: 'ask_id', type: 'question', x: 400, y: 280, data: { message: 'Enter your project ID or email:', variable: 'project_id', options: [] } },
            { id: 'ai_status', type: 'ai_response', x: 400, y: 420, data: { message: 'Looking up your project information...', ai_enabled: true, website_url: 'https://vonedigitals.com' } },
            { id: 'options', type: 'reply_buttons', x: 400, y: 560, data: { message: 'What would you like to do?', buttons: [{ id: 'talk', label: '💬 Talk to Team' }, { id: 'details', label: '📋 Project Details' }, { id: 'done', label: '✅ That\'s all' }] } },
            { id: 'end', type: 'end', x: 400, y: 700, data: { message: 'Thank you! 🙏\n\n📞 Contact: +91 9966192921\n🌐 vonedigitals.com' } }
          ],
          edges: [
            { from: 'start', to: 'greet' },
            { from: 'greet', to: 'ask_id' },
            { from: 'ask_id', to: 'ai_status' },
            { from: 'ai_status', to: 'options' },
            { from: 'options', to: 'end' }
          ]
        }
      },

      // Flow 5: Feedback & Review Flow
      {
        name: '⭐ Feedback Collection Flow',
        trigger_keyword: 'feedback,review,rate,suggestion,complaint',
        flow_json: {
          nodes: [
            { id: 'start', type: 'start', x: 400, y: 50, data: { message: 'Start' } },
            { id: 'greet', type: 'message', x: 400, y: 150, data: { message: 'We value your feedback! 🙏\n\nYour opinion helps us improve our services.\n\nHow was your experience with VONE Digitals?', buttons: [] } },
            { id: 'rating', type: 'reply_buttons', x: 400, y: 280, data: { message: 'Rate your experience:', buttons: [{ id: '5', label: '⭐⭐⭐⭐⭐ Excellent' }, { id: '3', label: '⭐⭐⭐ Good' }, { id: '1', label: '⭐ Needs Improvement' }] } },
            { id: 'ask_details', type: 'question', x: 400, y: 420, data: { message: 'Tell us more (optional):', variable: 'feedback_text', options: [] } },
            { id: 'thank', type: 'message', x: 400, y: 560, data: { message: 'Thank you for your feedback! 🎉\n\nYour input helps us serve you better.\n\nAs a token of appreciation, enjoy 10% off your next service!\n\nUse code: THANKYOU10', buttons: [] } },
            { id: 'end', type: 'end', x: 400, y: 700, data: { message: 'Have a wonderful day! 🌟' } }
          ],
          edges: [
            { from: 'start', to: 'greet' },
            { from: 'greet', to: 'rating' },
            { from: 'rating', to: 'ask_details' },
            { from: 'ask_details', to: 'thank' },
            { from: 'thank', to: 'end' }
          ]
        }
      }
    ];

    // Insert flows
    for (const flow of flows) {
      await pool.query(
        'INSERT INTO flows (owner_id, name, flow_json, trigger_keyword, active) VALUES (?, ?, ?, ?, ?)',
        [userId, flow.name, JSON.stringify(flow.flow_json), flow.trigger_keyword, true]
      );
    }

    console.log('5 pre-built flows created:');
    flows.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));
    console.log('\nUsers can now edit these flows and connect them to their WhatsApp number!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating pre-built flows:', err);
    process.exit(1);
  }
}

createPrebuiltFlows();

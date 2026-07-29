const pool = require('./config/db');

async function createWelcomeFlow() {
  try {
    // Get the first user (or admin)
    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users found. Create a user first.');
      process.exit(1);
    }
    const userId = users[0].id;

    // Check if welcome flow already exists
    const [existing] = await pool.query(
      "SELECT id FROM flows WHERE owner_id = ? AND name = 'VONE Digital Services'",
      [userId]
    );
    if (existing.length > 0) {
      console.log('Welcome flow already exists with ID:', existing[0].id);
      process.exit(0);
    }

    // Create the flow
    const flowJson = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          x: 400,
          y: 50,
          data: { message: 'Welcome to VONE Digitals!' }
        },
        {
          id: 'greeting',
          type: 'message',
          x: 400,
          y: 150,
          data: {
            message: 'Welcome to VONE Digitals! 🌟\n\nWe are a full-service digital agency in Vijayawada, India.\n\nHow can we help you today?',
            buttons: []
          }
        },
        {
          id: 'services_list',
          type: 'list_message',
          x: 400,
          y: 280,
          data: {
            message: 'Select a service to learn more:',
            button_text: 'View Services',
            sections: [{
              title: 'Our Services',
              rows: [
                { id: 'fullstack', title: 'Full Stack Development', description: 'React, Node.js, MERN stack' },
                { id: 'wordpress', title: 'WordPress Development', description: 'Custom themes & plugins' },
                { id: 'bulk', title: 'Bulk WhatsApp Messaging', description: 'Campaign management' },
                { id: 'coaching', title: 'Coaching & Training', description: 'Digital marketing courses' },
                { id: 'digitalmarketing', title: 'Digital Marketing', description: 'SEO, Social Media, Ads' },
                { id: 'branding', title: 'Branding & Design', description: 'Logo, brand identity' }
              ]
            }]
          }
        },
        {
          id: 'ai_fullstack',
          type: 'ai_response',
          x: 100,
          y: 450,
          data: {
            message: 'Let me tell you about our Full Stack Development services...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'ai_wordpress',
          type: 'ai_response',
          x: 300,
          y: 450,
          data: {
            message: 'Let me tell you about our WordPress Development services...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'ai_bulk',
          type: 'ai_response',
          x: 500,
          y: 450,
          data: {
            message: 'Let me tell you about our Bulk WhatsApp Messaging services...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'ai_coaching',
          type: 'ai_response',
          x: 700,
          y: 450,
          data: {
            message: 'Let me tell you about our Coaching & Training programs...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'ai_digitalmarketing',
          type: 'ai_response',
          x: 900,
          y: 450,
          data: {
            message: 'Let me tell you about our Digital Marketing services...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'ai_branding',
          type: 'ai_response',
          x: 1100,
          y: 450,
          data: {
            message: 'Let me tell you about our Branding & Design services...',
            ai_enabled: true,
            website_url: 'https://vonedigitals.com'
          }
        },
        {
          id: 'end',
          type: 'end',
          x: 600,
          y: 600,
          data: {
            message: 'Thank you for your interest in VONE Digitals! 🙏\n\n📞 Contact us: +91 9966192921\n🌐 Visit: vonedigitals.com\n📧 Email: vonedigitals@gmail.com\n\nWe look forward to working with you!'
          }
        }
      ],
      edges: [
        { from: 'start', to: 'greeting' },
        { from: 'greeting', to: 'services_list' },
        { from: 'services_list', to: 'ai_fullstack', label: 'fullstack' },
        { from: 'services_list', to: 'ai_wordpress', label: 'wordpress' },
        { from: 'services_list', to: 'ai_bulk', label: 'bulk' },
        { from: 'services_list', to: 'ai_coaching', label: 'coaching' },
        { from: 'services_list', to: 'ai_digitalmarketing', label: 'digitalmarketing' },
        { from: 'services_list', to: 'ai_branding', label: 'branding' },
        { from: 'ai_fullstack', to: 'end' },
        { from: 'ai_wordpress', to: 'end' },
        { from: 'ai_bulk', to: 'end' },
        { from: 'ai_coaching', to: 'end' },
        { from: 'ai_digitalmarketing', to: 'end' },
        { from: 'ai_branding', to: 'end' }
      ]
    };

    const [result] = await pool.query(
      'INSERT INTO flows (owner_id, name, flow_json, trigger_keyword, active) VALUES (?, ?, ?, ?, ?)',
      [userId, 'VONE Digital Services', JSON.stringify(flowJson), 'good morning,hi,hello', true]
    );

    console.log('Welcome flow created with ID:', result.insertId);
    console.log('Trigger keywords: good morning, hi, hello');
    console.log('Flow is active and ready to use!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating welcome flow:', err);
    process.exit(1);
  }
}

createWelcomeFlow();

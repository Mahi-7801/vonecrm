/**
 * WhatsApp Templates - Simple APPROVED Format
 * Node.js version of create_simple_templates.py
 * Creating simple templates without parameters first
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const WABA_ID = process.env.WHATSAPP_WABA_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
const API_BASE_URL = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'}`;

// Simple templates without parameters - matching hello_world format
const SIMPLE_TEMPLATES = [
  {
    name: 'mahi_account_created',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Account Created'
      },
      {
        type: 'BODY',
        text: 'Welcome to Mahi CRM! Your account has been created successfully. This message confirms your ability to receive WhatsApp notifications from our platform. Thank you for choosing Mahi CRM.'
      },
      {
        type: 'FOOTER',
        text: 'Mahi CRM Support Team'
      }
    ]
  },
  {
    name: 'mahi_order_received',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Order Received'
      },
      {
        type: 'BODY',
        text: 'Thank you for your order! We have received your order and it is now being processed. You will receive a confirmation email shortly with your order details and tracking information.'
      },
      {
        type: 'FOOTER',
        text: 'Thank you for shopping with us!'
      }
    ]
  },
  {
    name: 'mahi_support_received',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Support Request Received'
      },
      {
        type: 'BODY',
        text: 'We have received your support request. Our team will review your inquiry and respond within 24 hours. Thank you for contacting Mahi CRM support.'
      },
      {
        type: 'FOOTER',
        text: 'Mahi CRM Support'
      }
    ]
  },
];

async function createTemplate(templateData) {
  const url = `${API_BASE_URL}/${WABA_ID}/message_templates`;
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  console.log(`\nCreating: ${templateData.name}`);

  try {
    const response = await axios.post(url, templateData, { headers });
    console.log(`  ✅ Created! ID: ${response.data.id} | Status: ${response.data.status}`);
    return { success: true, id: response.data.id, status: response.data.status };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.log(`  ❌ Failed: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

async function getTemplates() {
  const url = `${API_BASE_URL}/${WABA_ID}/message_templates`;
  const headers = { 'Authorization': `Bearer ${ACCESS_TOKEN}` };

  try {
    const response = await axios.get(url, { headers });
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch templates:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('CREATING SIMPLE TEMPLATES (NO PARAMETERS)');
  console.log('='.repeat(70));
  console.log(`WABA: ${WABA_ID} (vonedigital)`);
  console.log('='.repeat(70));

  // Create templates
  const results = [];
  for (const template of SIMPLE_TEMPLATES) {
    const result = await createTemplate(template);
    results.push(result);
  }

  // Get all templates
  console.log('\n\n' + '='.repeat(70));
  console.log('ALL TEMPLATES ON YOUR DASHBOARD');
  console.log('='.repeat(70));

  const templates = await getTemplates();

  console.log(`\n${'Name'.padEnd(30)} ${'Category'.padEnd(12)} ${'Status'.padEnd(15)}`);
  console.log('-'.repeat(57));

  for (const t of templates) {
    console.log(`${(t.name || 'N/A').padEnd(30)} ${(t.category || 'N/A').padEnd(12)} ${(t.status || 'N/A').padEnd(15)}`);
  }

  console.log('-'.repeat(57));
  console.log(`Total: ${templates.length} templates`);

  // Summary
  const successful = results.filter(r => r.success).length;
  const approved = results.filter(r => r.status === 'APPROVED').length;
  const pending = results.filter(r => r.status === 'PENDING').length;

  console.log(`\n✅ Created: ${successful}/${results.length}`);
  console.log(`   - Approved: ${approved}`);
  console.log(`   - Pending: ${pending}`);

  console.log(`\n📋 Check your Meta Dashboard:`);
  console.log(`   https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id=1634178838276151`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createTemplate, getTemplates, SIMPLE_TEMPLATES };

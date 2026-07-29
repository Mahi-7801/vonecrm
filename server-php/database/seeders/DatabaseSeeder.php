<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Plan;
use App\Models\AiAgent;
use App\Models\Flow;
use App\Models\DripSequence;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::updateOrCreate(
            ['email' => 'admin'],
            [
                'password_hash' => Hash::make('admin123'),
                'role' => 'admin',
                'balance' => 0,
                'credit_mode' => 'postpaid',
            ]
        );
        $adminId = $admin->id;

        // Create default plans
        Plan::updateOrCreate(
            ['name' => 'Basic'],
            [
                'description' => 'Perfect for small businesses starting with WhatsApp marketing',
                'price' => 499,
                'duration_days' => 30,
                'max_messages' => 1000,
                'max_contacts' => 500,
                'features' => ['WhatsApp Messaging', 'Basic Templates', 'Contact Management'],
                'active' => true,
            ]
        );

        Plan::updateOrCreate(
            ['name' => 'Professional'],
            [
                'description' => 'For growing businesses with advanced messaging needs',
                'price' => 999,
                'duration_days' => 30,
                'max_messages' => 5000,
                'max_contacts' => 2000,
                'features' => ['All Basic Features', 'Bulk Broadcasting', 'Flow Builder', 'AI Auto-Reply', 'Priority Support'],
                'active' => true,
            ]
        );

        Plan::updateOrCreate(
            ['name' => 'Enterprise'],
            [
                'description' => 'Unlimited access for large organizations',
                'price' => 2999,
                'duration_days' => 30,
                'max_messages' => null,
                'max_contacts' => null,
                'features' => ['All Professional Features', 'Unlimited Messages', 'Custom AI Agents', 'Drip Sequences', 'Dedicated Support', 'API Access'],
                'active' => true,
            ]
        );

        // Create prebuilt AI agents
        $prebuiltAgents = [
            [
                'name' => 'Alex',
                'role' => 'Full Stack Developer',
                'specialty' => 'React, Node.js, MERN Stack',
                'system_prompt' => 'You are Alex, a senior full-stack developer specializing in React, Node.js, and MERN stack development. You help clients with web development projects, provide technical consultations, and explain complex technical concepts in simple terms.',
                'personality' => 'Professional, detail-oriented, patient teacher',
                'avatar_emoji' => '👨‍💻',
                'is_prebuilt' => true,
            ],
            [
                'name' => 'Sarah',
                'role' => 'WordPress Expert',
                'specialty' => 'WordPress, WooCommerce, Themes, Plugins',
                'system_prompt' => 'You are Sarah, a WordPress expert specializing in theme customization, plugin development, and WooCommerce solutions. You help clients build and manage their WordPress websites.',
                'personality' => 'Friendly, creative, solution-focused',
                'avatar_emoji' => '👩‍💻',
                'is_prebuilt' => true,
            ],
            [
                'name' => 'Raj',
                'role' => 'Digital Marketing Guru',
                'specialty' => 'SEO, Google Ads, Meta Ads, Social Media Marketing',
                'system_prompt' => 'You are Raj, a digital marketing expert specializing in SEO, Google Ads, Meta Ads, and social media marketing. You help clients grow their online presence and reach their target audience.',
                'personality' => 'Data-driven, strategic, results-oriented',
                'avatar_emoji' => '📈',
                'is_prebuilt' => true,
            ],
            [
                'name' => 'Priya',
                'role' => 'Bulk Messaging Specialist',
                'specialty' => 'WhatsApp API, Campaign Management, Template Design',
                'system_prompt' => 'You are Priya, a WhatsApp bulk messaging specialist. You help clients create effective WhatsApp campaigns, design templates, and manage their messaging strategy for maximum engagement.',
                'personality' => 'Efficient, campaign-savvy, compliance-aware',
                'avatar_emoji' => '💬',
                'is_prebuilt' => true,
            ],
            [
                'name' => 'Design',
                'role' => 'Creative Director',
                'specialty' => 'Brand Identity, Logo Design, UI/UX',
                'system_prompt' => 'You are the Creative Director, specializing in brand identity, logo design, and UI/UX design. You help clients create compelling visual identities and user experiences for their businesses.',
                'personality' => 'Creative, visually-oriented, trend-aware',
                'avatar_emoji' => '🎨',
                'is_prebuilt' => true,
            ],
        ];

        foreach ($prebuiltAgents as $agentData) {
            AiAgent::firstOrCreate(
                ['name' => $agentData['name']],
                array_merge($agentData, ['owner_id' => $adminId, 'is_published' => true, 'is_prebuilt' => true])
            );
        }

        // Create prebuilt flows
        $this->seedFlows($adminId);

        // Create prebuilt drip sequences
        $this->seedDripSequences($adminId);
    }

    private function seedFlows(int $adminId): void
    {
        // Flow 1: Welcome Flow
        $welcomeNodes = [
            ['id' => 'start', 'type' => 'start', 'x' => 400, 'y' => 50, 'data' => ['message' => 'Welcome!']],
            ['id' => 'greet', 'type' => 'message', 'x' => 400, 'y' => 150, 'data' => ['message' => "Hello! Welcome to our platform.\n\nHow can we help you today?", 'buttons' => []]],
            ['id' => 'services', 'type' => 'list_message', 'x' => 400, 'y' => 280, 'data' => $this->welcomeServiceList()],
            ['id' => 'ai_fullstack', 'type' => 'ai_response', 'x' => 100, 'y' => 450, 'data' => ['message' => 'Let me tell you about our Full Stack Development services...', 'ai_enabled' => true]],
            ['id' => 'ai_wordpress', 'type' => 'ai_response', 'x' => 300, 'y' => 450, 'data' => ['message' => 'Let me tell you about our WordPress services...', 'ai_enabled' => true]],
            ['id' => 'ai_marketing', 'type' => 'ai_response', 'x' => 500, 'y' => 450, 'data' => ['message' => 'Let me tell you about our Digital Marketing services...', 'ai_enabled' => true]],
            ['id' => 'ai_branding', 'type' => 'ai_response', 'x' => 700, 'y' => 450, 'data' => ['message' => 'Let me tell you about our Branding services...', 'ai_enabled' => true]],
            ['id' => 'ai_bulk', 'type' => 'ai_response', 'x' => 900, 'y' => 450, 'data' => ['message' => 'Let me tell you about our Bulk Messaging services...', 'ai_enabled' => true]],
            ['id' => 'end', 'type' => 'end', 'x' => 600, 'y' => 620, 'data' => ['message' => "Thank you for your interest!\n\nWe look forward to working with you!"]],
        ];
        $welcomeEdges = [
            ['from' => 'start', 'to' => 'greet'],
            ['from' => 'greet', 'to' => 'services'],
            ['from' => 'services', 'to' => 'ai_fullstack'],
            ['from' => 'services', 'to' => 'ai_wordpress'],
            ['from' => 'services', 'to' => 'ai_marketing'],
            ['from' => 'services', 'to' => 'ai_branding'],
            ['from' => 'services', 'to' => 'ai_bulk'],
            ['from' => 'ai_fullstack', 'to' => 'end'],
            ['from' => 'ai_wordpress', 'to' => 'end'],
            ['from' => 'ai_marketing', 'to' => 'end'],
            ['from' => 'ai_branding', 'to' => 'end'],
            ['from' => 'ai_bulk', 'to' => 'end'],
        ];
        Flow::updateOrCreate(
            ['name' => 'Welcome Flow', 'owner_id' => $adminId],
            ['flow_json' => ['nodes' => $welcomeNodes, 'edges' => $welcomeEdges], 'trigger_keyword' => 'hi,hello,hey,good morning,good evening', 'active' => true, 'is_published' => true]
        );

        // Flow 2: Lead Capture Flow
        $leadNodes = [
            ['id' => 'start', 'type' => 'start', 'x' => 400, 'y' => 50, 'data' => ['message' => 'Start']],
            ['id' => 'ask_name', 'type' => 'question', 'x' => 400, 'y' => 150, 'data' => ['message' => "Great! I'd love to help you.\n\nWhat's your name?", 'variable' => 'user_name', 'options' => []]],
            ['id' => 'ask_service', 'type' => 'list_message', 'x' => 400, 'y' => 280, 'data' => $this->leadServiceList()],
            ['id' => 'ask_budget', 'type' => 'question', 'x' => 400, 'y' => 420, 'data' => ['message' => "What's your budget range?", 'variable' => 'budget', 'options' => []]],
            ['id' => 'ask_phone', 'type' => 'question', 'x' => 400, 'y' => 550, 'data' => ['message' => 'Please share your phone number so our team can reach out:', 'variable' => 'phone', 'options' => []]],
            ['id' => 'confirm', 'type' => 'message', 'x' => 400, 'y' => 680, 'data' => ['message' => "Thank you! Our team will contact you shortly.", 'buttons' => []]],
            ['id' => 'end', 'type' => 'end', 'x' => 400, 'y' => 800, 'data' => ['message' => 'Have a great day!']],
        ];
        $leadEdges = [
            ['from' => 'start', 'to' => 'ask_name'],
            ['from' => 'ask_name', 'to' => 'ask_service'],
            ['from' => 'ask_service', 'to' => 'ask_budget'],
            ['from' => 'ask_budget', 'to' => 'ask_phone'],
            ['from' => 'ask_phone', 'to' => 'confirm'],
            ['from' => 'confirm', 'to' => 'end'],
        ];
        Flow::updateOrCreate(
            ['name' => 'Lead Capture Flow', 'owner_id' => $adminId],
            ['flow_json' => ['nodes' => $leadNodes, 'edges' => $leadEdges], 'trigger_keyword' => 'price,pricing,cost,quote,demo,interested', 'active' => true, 'is_published' => true]
        );

        // Flow 3: Customer Support Flow
        $supportNodes = [
            ['id' => 'start', 'type' => 'start', 'x' => 400, 'y' => 50, 'data' => ['message' => 'Start']],
            ['id' => 'greet', 'type' => 'message', 'x' => 400, 'y' => 150, 'data' => ['message' => "Hi there! I'm here to help you with any issues.\n\nWhat do you need help with?", 'buttons' => []]],
            ['id' => 'category', 'type' => 'reply_buttons', 'x' => 400, 'y' => 280, 'data' => $this->supportCategoryButtons()],
            ['id' => 'ai_support', 'type' => 'ai_response', 'x' => 400, 'y' => 420, 'data' => ['message' => 'Let me help you with that...', 'ai_enabled' => true]],
            ['id' => 'escalate', 'type' => 'message', 'x' => 400, 'y' => 560, 'data' => ['message' => "I've noted your issue. Our support team will get back to you within 24 hours.", 'buttons' => []]],
            ['id' => 'end', 'type' => 'end', 'x' => 400, 'y' => 700, 'data' => ['message' => 'Thank you for reaching out!']],
        ];
        $supportEdges = [
            ['from' => 'start', 'to' => 'greet'],
            ['from' => 'greet', 'to' => 'category'],
            ['from' => 'category', 'to' => 'ai_support'],
            ['from' => 'ai_support', 'to' => 'escalate'],
            ['from' => 'escalate', 'to' => 'end'],
        ];
        Flow::updateOrCreate(
            ['name' => 'Customer Support Flow', 'owner_id' => $adminId],
            ['flow_json' => ['nodes' => $supportNodes, 'edges' => $supportEdges], 'trigger_keyword' => 'support,help,issue,problem,not working,bug', 'active' => true, 'is_published' => true]
        );

        // Flow 4: Service Inquiry Flow
        $inquiryNodes = [
            ['id' => 'start', 'type' => 'start', 'x' => 400, 'y' => 50, 'data' => ['message' => 'Start']],
            ['id' => 'greet', 'type' => 'message', 'x' => 400, 'y' => 150, 'data' => ['message' => "Hello! I can help you check on your project status.\n\nPlease share your project ID or registered email:", 'buttons' => []]],
            ['id' => 'ask_id', 'type' => 'question', 'x' => 400, 'y' => 280, 'data' => ['message' => 'Enter your project ID or email:', 'variable' => 'project_id', 'options' => []]],
            ['id' => 'ai_status', 'type' => 'ai_response', 'x' => 400, 'y' => 420, 'data' => ['message' => 'Looking up your project information...', 'ai_enabled' => true]],
            ['id' => 'options', 'type' => 'reply_buttons', 'x' => 400, 'y' => 560, 'data' => $this->inquiryOptionsButtons()],
            ['id' => 'end', 'type' => 'end', 'x' => 400, 'y' => 700, 'data' => ['message' => 'Thank you!']],
        ];
        $inquiryEdges = [
            ['from' => 'start', 'to' => 'greet'],
            ['from' => 'greet', 'to' => 'ask_id'],
            ['from' => 'ask_id', 'to' => 'ai_status'],
            ['from' => 'ai_status', 'to' => 'options'],
            ['from' => 'options', 'to' => 'end'],
        ];
        Flow::updateOrCreate(
            ['name' => 'Service Inquiry Flow', 'owner_id' => $adminId],
            ['flow_json' => ['nodes' => $inquiryNodes, 'edges' => $inquiryEdges], 'trigger_keyword' => 'status,order,project,update,progress,delivery', 'active' => true, 'is_published' => true]
        );

        // Flow 5: Feedback Collection Flow
        $feedbackNodes = [
            ['id' => 'start', 'type' => 'start', 'x' => 400, 'y' => 50, 'data' => ['message' => 'Start']],
            ['id' => 'greet', 'type' => 'message', 'x' => 400, 'y' => 150, 'data' => ['message' => "We value your feedback!\n\nYour opinion helps us improve our services.\n\nHow was your experience?", 'buttons' => []]],
            ['id' => 'rating', 'type' => 'reply_buttons', 'x' => 400, 'y' => 280, 'data' => $this->feedbackRatingButtons()],
            ['id' => 'ask_details', 'type' => 'question', 'x' => 400, 'y' => 420, 'data' => ['message' => 'Tell us more (optional):', 'variable' => 'feedback_text', 'options' => []]],
            ['id' => 'thank', 'type' => 'message', 'x' => 400, 'y' => 560, 'data' => ['message' => "Thank you for your feedback!\n\nYour input helps us serve you better.", 'buttons' => []]],
            ['id' => 'end', 'type' => 'end', 'x' => 400, 'y' => 700, 'data' => ['message' => 'Have a wonderful day!']],
        ];
        $feedbackEdges = [
            ['from' => 'start', 'to' => 'greet'],
            ['from' => 'greet', 'to' => 'rating'],
            ['from' => 'rating', 'to' => 'ask_details'],
            ['from' => 'ask_details', 'to' => 'thank'],
            ['from' => 'thank', 'to' => 'end'],
        ];
        Flow::updateOrCreate(
            ['name' => 'Feedback Collection Flow', 'owner_id' => $adminId],
            ['flow_json' => ['nodes' => $feedbackNodes, 'edges' => $feedbackEdges], 'trigger_keyword' => 'feedback,review,rate,suggestion,complaint', 'active' => true, 'is_published' => true]
        );
    }

    private function welcomeServiceList(): array
    {
        return [
            'message' => 'Select a service to learn more:',
            'button_text' => 'View Services',
            'sections' => [
                [
                    'title' => 'Our Services',
                    'rows' => [
                        ['id' => 'fullstack', 'title' => 'Full Stack Development', 'description' => 'React, Node.js, MERN'],
                        ['id' => 'wordpress', 'title' => 'WordPress Development', 'description' => 'Custom themes & plugins'],
                        ['id' => 'marketing', 'title' => 'Digital Marketing', 'description' => 'SEO, Social Media, Ads'],
                        ['id' => 'branding', 'title' => 'Branding & Design', 'description' => 'Logo, brand identity'],
                        ['id' => 'bulk', 'title' => 'Bulk Messaging', 'description' => 'WhatsApp campaigns'],
                    ],
                ],
            ],
        ];
    }

    private function leadServiceList(): array
    {
        return [
            'message' => 'Hi! Which service are you interested in?',
            'button_text' => 'Select Service',
            'sections' => [
                [
                    'title' => 'Services',
                    'rows' => [
                        ['id' => 'web', 'title' => 'Website Development', 'description' => 'Custom websites & apps'],
                        ['id' => 'marketing', 'title' => 'Digital Marketing', 'description' => 'SEO, Ads, Social Media'],
                        ['id' => 'branding', 'title' => 'Branding & Design', 'description' => 'Logo, brand identity'],
                        ['id' => 'other', 'title' => 'Other', 'description' => 'Something else'],
                    ],
                ],
            ],
        ];
    }

    private function supportCategoryButtons(): array
    {
        return [
            'message' => 'Select a category:',
            'buttons' => [
                ['id' => 'website', 'label' => 'Website Issue'],
                ['id' => 'billing', 'label' => 'Billing'],
                ['id' => 'other', 'label' => 'Other'],
            ],
        ];
    }

    private function inquiryOptionsButtons(): array
    {
        return [
            'message' => 'What would you like to do?',
            'buttons' => [
                ['id' => 'talk', 'label' => 'Talk to Team'],
                ['id' => 'details', 'label' => 'Project Details'],
                ['id' => 'done', 'label' => "That's all"],
            ],
        ];
    }

    private function feedbackRatingButtons(): array
    {
        return [
            'message' => 'Rate your experience:',
            'buttons' => [
                ['id' => '5', 'label' => 'Excellent'],
                ['id' => '3', 'label' => 'Good'],
                ['id' => '1', 'label' => 'Needs Improvement'],
            ],
        ];
    }

    private function seedDripSequences(int $adminId): void
    {
        $sequences = [
            [
                'name' => 'Welcome New User',
                'steps' => [
                    ['delay_hours' => 0, 'template_name' => 'welcome', 'message' => 'Welcome to our platform! We are excited to have you on board.'],
                    ['delay_hours' => 24, 'template_name' => 'tips', 'message' => 'Here are some tips to get started: 1. Complete your profile 2. Explore our features 3. Connect your WhatsApp number'],
                    ['delay_hours' => 72, 'template_name' => 'check_in', 'message' => 'How is your experience so far? We would love to hear your feedback!'],
                ],
                'active' => true,
            ],
            [
                'name' => 'Follow Up Sequence',
                'steps' => [
                    ['delay_hours' => 0, 'template_name' => 'greeting', 'message' => 'Hi! Thanks for your interest in our services.'],
                    ['delay_hours' => 48, 'template_name' => 'follow_up', 'message' => 'Just checking in — do you have any questions about our platform?'],
                    ['delay_hours' => 168, 'template_name' => 'final', 'message' => 'Last chance to try our premium features! Special offer ends soon.'],
                ],
                'active' => true,
            ],
            [
                'name' => 'Re-engagement Campaign',
                'steps' => [
                    ['delay_hours' => 0, 'template_name' => 'miss_you', 'message' => 'We miss you! It has been a while since your last visit.'],
                    ['delay_hours' => 72, 'template_name' => 'offer', 'message' => 'Here is a special 20% discount just for you! Use code WELCOME20.'],
                ],
                'active' => false,
            ],
        ];

        foreach ($sequences as $seqData) {
            DripSequence::firstOrCreate(
                ['name' => $seqData['name']],
                [
                    'owner_id' => $adminId,
                    'steps' => $seqData['steps'],
                    'active' => $seqData['active'],
                ]
            );
        }
    }
}

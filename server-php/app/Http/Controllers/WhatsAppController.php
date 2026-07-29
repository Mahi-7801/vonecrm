<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Message;
use App\Models\Contact;
use App\Models\WhatsappNumber;
use App\Models\Flow;
use App\Models\FlowConversation;
use App\Services\WhatsAppService;
use App\Services\GroqAiService;
use App\Services\SettingService;

class WhatsAppController extends Controller
{
    private array $serviceKeywords = [
        'fullstack' => ['full stack', 'fullstack', 'web development', 'website', 'react', 'node', 'mern'],
        'wordpress' => ['wordpress', 'wp', 'theme', 'plugin', 'woocommerce'],
        'bulk' => ['bulk', 'broadcast', 'mass', 'bulk messaging'],
        'coaching' => ['coaching', 'training', 'course', 'mentor'],
        'digitalmarketing' => ['marketing', 'seo', 'google ads', 'meta ads', 'digital marketing'],
        'branding' => ['branding', 'logo', 'brand identity', 'ui/ux', 'design'],
    ];

    public function verifyWebhook(Request $request)
    {
        $verifyToken = SettingService::get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?: config('whatsapp.webhook_verify_token');
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === $verifyToken) {
            Log::info('Webhook verified successfully');
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        Log::warning('Webhook verification failed', ['token' => $token]);
        return response('Forbidden', 403);
    }

    public function handleWebhook(Request $request)
    {
        $body = $request->all();

        // Log webhook
        Log::info('WhatsApp webhook received', ['type' => $body['entry'][0]['changes'][0]['value']['messaging_product'] ?? 'unknown']);

        // Verify signature (optional)
        // $signature = $request->header('x-hub-signature-256');

        $changes = $body['entry'][0]['changes'][0] ?? null;
        if (!$changes) {
            return response()->json(['status' => 'ok']);
        }

        $value = $changes['value'];

        // Handle incoming messages
        if (!empty($value['messages'])) {
            foreach ($value['messages'] as $message) {
                $this->processIncomingMessage($message, $value['contacts'][0] ?? null, $value['metadata'] ?? []);
            }
        }

        // Handle status updates
        if (!empty($value['statuses'])) {
            foreach ($value['statuses'] as $status) {
                $this->processStatusUpdate($status);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    private function processIncomingMessage(array $message, ?array $contactData, array $metadata): void
    {
        try {
            $from = $message['from'] ?? null;
            $messageId = $message['id'] ?? null;
            $type = $message['type'] ?? 'text';

            if (!$from || !$messageId) return;

            // Skip echo messages
            if (($message['from'] ?? '') === ($metadata['display_phone_number'] ?? '')) {
                return;
            }

            // Find the owner from the phone_number_id
            $phoneNumberId = $metadata['phone_number_id'] ?? null;
            $waNumber = WhatsappNumber::where('phone_number_id', $phoneNumberId)
                ->where('verified', true)
                ->first();

            if (!$waNumber) {
                Log::warning('No verified WA number found for webhook', ['phone_number_id' => $phoneNumberId]);
                return;
            }

            $ownerId = $waNumber->owner_id;

            // Find or create contact
            $contact = Contact::where('owner_id', $ownerId)
                ->where('phone', $from)
                ->first();

            if (!$contact) {
                $contact = Contact::create([
                    'owner_id' => $ownerId,
                    'name' => $contactData['profile']['name'] ?? 'Unknown',
                    'phone' => $from,
                ]);
            }

            // Extract message body
            $body = '';
            if ($type === 'text') {
                $body = $message['text']['body'] ?? '';
            } elseif ($type === 'interactive') {
                $interactive = $message['interactive'];
                if ($interactive['type'] === 'list_reply') {
                    $body = $interactive['list_reply']['title'] ?? '';
                } elseif ($interactive['type'] === 'button_reply') {
                    $body = $interactive['button_reply']['title'] ?? '';
                }
            }

            // Save message
            $msg = Message::create([
                'owner_id' => $ownerId,
                'contact_id' => $contact->id,
                'direction' => 'inbound',
                'body' => $body,
                'wa_message_id' => $messageId,
                'status' => 'received',
            ]);

            // Handle flow responses
            if ($this->handleFlowResponse($contact, $body, $ownerId, $message)) {
                return;
            }

            // Auto-reply with AI
            $this->generateAutoReply($contact, $body, $ownerId);

        } catch (\Exception $e) {
            Log::error('Error processing incoming message: ' . $e->getMessage());
        }
    }

    private function processStatusUpdate(array $status): void
    {
        try {
            $messageId = $status['id'] ?? null;
            $messageStatus = $status['status'] ?? null;

            if (!$messageId || !$messageStatus) return;

            Message::where('wa_message_id', $messageId)
                ->update(['status' => $messageStatus]);
        } catch (\Exception $e) {
            Log::error('Error processing status update: ' . $e->getMessage());
        }
    }

    private function handleFlowResponse(Contact $contact, string $messageBody, int $ownerId, array $rawMessage): bool
    {
        // Check for active flow conversation
        $activeConv = FlowConversation::where('contact_id', $contact->id)
            ->where('owner_id', $ownerId)
            ->whereHas('flow', function ($q) {
                $q->where('active', true);
            })
            ->with('flow')
            ->latest()
            ->first();

        if ($activeConv && $activeConv->flow) {
            // Handle the response within the flow context
            $this->handleFlowNodeResponse($activeConv, $messageBody, $ownerId);
            return true;
        }

        // Check for flow trigger keywords
        $triggeredFlow = $this->findFlowByTrigger($messageBody, $ownerId);
        if ($triggeredFlow) {
            $this->triggerFlow($triggeredFlow, $contact, $ownerId, $messageBody);
            return true;
        }

        return false;
    }

    private function findFlowByTrigger(string $messageBody, int $ownerId): ?Flow
    {
        $lowerBody = strtolower(trim($messageBody));

        return Flow::where('active', true)
            ->where(function ($q) use ($ownerId) {
                $q->where('owner_id', $ownerId)
                    ->orWhere('is_published', true);
            })
            ->whereNotNull('trigger_keyword')
            ->get()
            ->first(function ($flow) use ($lowerBody) {
                $keywords = array_map('trim', explode(',', strtolower($flow->trigger_keyword)));
                foreach ($keywords as $keyword) {
                    if (str_contains($lowerBody, $keyword)) {
                        return true;
                    }
                }
                return false;
            });
    }

    private function triggerFlow(Flow $flow, Contact $contact, int $ownerId, string $initialMessage): void
    {
        $conversation = FlowConversation::create([
            'flow_id' => $flow->id,
            'contact_id' => $contact->id,
            'owner_id' => $ownerId,
            'current_node' => null,
            'context' => ['initial_message' => $initialMessage],
        ]);

        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        $startNode = collect($nodes)->firstWhere('type', 'start');
        if (!$startNode) return;

        // Auto-advance through non-interactive nodes
        $currentNode = $startNode;
        while ($currentNode) {
            $nextEdge = collect($edges)->firstWhere('from', $currentNode['id']);
            if (!$nextEdge) break;

            $nextNode = collect($nodes)->firstWhere('id', $nextEdge['to']);
            if (!$nextNode) break;

            $nodeType = $nextNode['type'] ?? 'message';

            if (in_array($nodeType, ['question', 'list_message', 'reply_buttons'])) {
                // Interactive node - send and stop
                $conversation->update(['current_node' => $nextNode['id']]);
                $this->sendFlowNodeMessage($contact, $nextNode, $ownerId);

                FlowMessage::create([
                    'conversation_id' => $conversation->id,
                    'node_id' => $nextNode['id'],
                    'role' => 'assistant',
                    'content' => $nextNode['data']['message'] ?? '',
                ]);
                break;
            } elseif ($nodeType === 'ai_response') {
                // AI node
                $groqService = new GroqAiService();
                $response = $groqService->generateFlowResponse(
                    $initialMessage,
                    $nextNode['data']['system_prompt'] ?? 'You are a helpful assistant.'
                );

                FlowMessage::create([
                    'conversation_id' => $conversation->id,
                    'node_id' => $nextNode['id'],
                    'role' => 'assistant',
                    'content' => $response,
                ]);

                $this->sendTextMessage($contact, $response, $ownerId);
                $currentNode = $nextNode;
            } elseif ($nodeType === 'end') {
                $conversation->update(['current_node' => $nextNode['id']]);
                break;
            } else {
                // Message node - send and continue
                if (!empty($nextNode['data']['message'])) {
                    $this->sendTextMessage($contact, $nextNode['data']['message'], $ownerId);

                    FlowMessage::create([
                        'conversation_id' => $conversation->id,
                        'node_id' => $nextNode['id'],
                        'role' => 'assistant',
                        'content' => $nextNode['data']['message'],
                    ]);
                }
                $currentNode = $nextNode;
            }
        }
    }

    private function handleFlowNodeResponse(FlowConversation $conversation, string $messageBody, int $ownerId): void
    {
        $flow = $conversation->flow;
        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        $contact = Contact::find($conversation->contact_id);

        // Save user message
        FlowMessage::create([
            'conversation_id' => $conversation->id,
            'node_id' => $conversation->current_node,
            'role' => 'user',
            'content' => $messageBody,
        ]);

        // Find matching edge from current node
        $currentNodeId = $conversation->current_node;
        $matchingEdge = collect($edges)->first(function ($edge) use ($currentNodeId, $messageBody) {
            if ($edge['from'] !== $currentNodeId) return false;
            if (isset($edge['matchText'])) {
                return str_contains(strtolower($messageBody), strtolower($edge['matchText']));
            }
            return true;
        });

        if (!$matchingEdge) return;

        $nextNode = collect($nodes)->firstWhere('id', $matchingEdge['to']);
        if (!$nextNode) return;

        $conversation->update(['current_node' => $nextNode['id']]);

        // Process next node
        $nodeType = $nextNode['type'] ?? 'message';

        if ($nodeType === 'ai_response') {
            $groqService = new GroqAiService();
            $response = $groqService->generateFlowResponse(
                $messageBody,
                $nextNode['data']['system_prompt'] ?? 'You are a helpful assistant.'
            );

            FlowMessage::create([
                'conversation_id' => $conversation->id,
                'node_id' => $nextNode['id'],
                'role' => 'assistant',
                'content' => $response,
            ]);

            if ($contact) {
                $this->sendTextMessage($contact, $response, $ownerId);
            }
        } elseif ($nodeType === 'end') {
            // Flow ended
            return;
        } elseif (in_array($nodeType, ['question', 'list_message', 'reply_buttons'])) {
            $this->sendFlowNodeMessage($contact, $nextNode, $ownerId);

            FlowMessage::create([
                'conversation_id' => $conversation->id,
                'node_id' => $nextNode['id'],
                'role' => 'assistant',
                'content' => $nextNode['data']['message'] ?? '',
            ]);
        } else {
            if (!empty($nextNode['data']['message'])) {
                FlowMessage::create([
                    'conversation_id' => $conversation->id,
                    'node_id' => $nextNode['id'],
                    'role' => 'assistant',
                    'content' => $nextNode['data']['message'],
                ]);

                if ($contact) {
                    $this->sendTextMessage($contact, $nextNode['data']['message'], $ownerId);
                }
            }
        }
    }

    private function generateAutoReply(Contact $contact, string $messageBody, int $ownerId): void
    {
        $groqService = new GroqAiService();

        $systemPrompt = "You are a helpful customer support agent for V ONE DIGITALS, a digital services company. Be professional, friendly, and concise. Help customers with their inquiries about web development, digital marketing, WordPress, branding, and bulk messaging services.";

        $response = $groqService->generateResponse($messageBody, $systemPrompt);

        $this->sendTextMessage($contact, $response, $ownerId);
    }

    private function sendTextMessage(Contact $contact, string $message, int $ownerId): void
    {
        try {
            $waNumber = WhatsappNumber::where('owner_id', $ownerId)
                ->where('verified', true)
                ->first();

            if (!$waNumber) return;

            $waService = new WhatsAppService();
            $cleanPhone = preg_replace('/[\s\-()+]/', '', $contact->phone);
            if (!str_starts_with($cleanPhone, '91') && strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }

            $token = $waNumber->access_token ?: config('whatsapp.system_user_token');
            $result = $waService->sendTextMessage($cleanPhone, $message, $token);

            $waMessageId = $result['messages'][0]['id'] ?? null;

            Message::create([
                'owner_id' => $ownerId,
                'contact_id' => $contact->id,
                'direction' => 'outbound',
                'body' => $message,
                'wa_message_id' => $waMessageId,
                'status' => 'sent',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send WhatsApp message: ' . $e->getMessage());
        }
    }

    private function sendFlowNodeMessage(Contact $contact, array $node, int $ownerId): void
    {
        $message = $node['data']['message'] ?? '';
        if (empty($message)) return;

        $nodeType = $node['type'] ?? 'message';

        try {
            $waNumber = WhatsappNumber::where('owner_id', $ownerId)
                ->where('verified', true)
                ->first();

            if (!$waNumber) return;

            $waService = new WhatsAppService();
            $cleanPhone = preg_replace('/[\s\-()+]/', '', $contact->phone);
            if (!str_starts_with($cleanPhone, '91') && strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }

            $token = $waNumber->access_token ?: config('whatsapp.system_user_token');

            if ($nodeType === 'list_message') {
                $waService->sendListMessage($cleanPhone, $message, 'Select Option', $node['data']['sections'] ?? [], $token);
            } elseif ($nodeType === 'reply_buttons') {
                $waService->sendReplyButtons($cleanPhone, $message, $node['data']['buttons'] ?? [], $token);
            } else {
                $waService->sendTextMessage($cleanPhone, $message, $token);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send flow node message: ' . $e->getMessage());
        }
    }

    public function getVerificationStatus(Request $request)
    {
        $user = $request->user();
        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        if (!$waNumber) {
            return response()->json(['error' => 'No verified number'], 404);
        }

        $waService = new WhatsAppService();
        $status = $waService->getPhoneVerificationStatus($waNumber->phone_number_id);

        return response()->json($status);
    }

    public function getConfigId(Request $request)
    {
        return response()->json([
            'config_id' => SettingService::get('WHATSAPP_CONFIG_ID') ?: config('whatsapp.config_id'),
            'app_id' => SettingService::get('WHATSAPP_APP_ID') ?: config('whatsapp.app_id'),
        ]);
    }

    public function getNumbers(Request $request)
    {
        $user = $request->user();
        $numbers = WhatsappNumber::where('owner_id', $user->id)->get();
        return response()->json($numbers);
    }

    public function connect(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();
        $waService = new WhatsAppService();

        try {
            // Exchange code for short-lived token
            $tokenResponse = \Illuminate\Support\Facades\Http::post("https://graph.facebook.com/v21.0/oauth/access_token", [
                'client_id' => SettingService::get('WHATSAPP_APP_ID') ?: config('whatsapp.app_id'),
                'client_secret' => SettingService::get('WHATSAPP_APP_SECRET') ?: config('whatsapp.app_secret'),
                'code' => $validated['code'],
                'redirect_uri' => SettingService::get('WHATSAPP_REDIRECT_URI') ?: (config('whatsapp.redirect_uri') ?: 'http://localhost:3000/onboarding/callback'),
            ]);

            $shortToken = $tokenResponse->json()['access_token'] ?? null;
            if (!$shortToken) {
                return response()->json(['error' => 'Failed to exchange code'], 400);
            }

            // Exchange for long-lived token
            $longTokenResponse = \Illuminate\Support\Facades\Http::get("https://graph.facebook.com/v21.0/oauth/access_token", [
                'client_id' => SettingService::get('WHATSAPP_APP_ID') ?: config('whatsapp.app_id'),
                'client_secret' => SettingService::get('WHATSAPP_APP_SECRET') ?: config('whatsapp.app_secret'),
                'grant_type' => 'fb_exchange_token',
                'fb_exchange_token' => $shortToken,
            ]);

            $longToken = $longTokenResponse->json()['access_token'] ?? $shortToken;

            // Get WABA IDs
            $wabaResponse = \Illuminate\Support\Facades\Http::withToken($longToken)
                ->get("https://graph.facebook.com/v21.0/debug_token", [
                    'input_token' => $longToken,
                    'access_token' => SettingService::get('WHATSAPP_SYSTEM_USER_TOKEN') ?: config('whatsapp.system_user_token'),
                ]);

            $wabaIds = [];
            $phones = [];
            $granularScopes = $wabaResponse->json()['data']['granular_scopes'] ?? [];
            foreach ($granularScopes as $scope) {
                if (($scope['scope'] ?? '') === 'whatsapp_business_management') {
                    $wabaIds = array_merge($wabaIds, $scope['target_ids'] ?? []);
                }
            }

            // Get phone numbers for each WABA
            foreach ($wabaIds as $wabaId) {
                $phonesResponse = \Illuminate\Support\Facades\Http::withToken($longToken)
                    ->get("https://graph.facebook.com/v21.0/{$wabaId}/phone_numbers");

                foreach ($phonesResponse->json()['data'] ?? [] as $phone) {
                    $phones[] = [
                        'phone_number_id' => $phone['id'],
                        'display_phone_number' => $phone['display_phone_number'],
                        'verified_name' => $phone['verified_name'] ?? '',
                        'waba_id' => $wabaId,
                    ];
                }
            }

            // Save numbers
            foreach ($phones as $phone) {
                $existing = WhatsappNumber::where('owner_id', $user->id)
                    ->where('phone_number_id', $phone['phone_number_id'])
                    ->first();

                if (!$existing) {
                    WhatsappNumber::create([
                        'owner_id' => $user->id,
                        'phone_number_id' => $phone['phone_number_id'],
                        'waba_id' => $phone['waba_id'],
                        'verified' => true,
                        'status' => 'verified',
                        'access_token' => $longToken,
                        'display_phone_number' => $phone['display_phone_number'],
                        'verified_name' => $phone['verified_name'],
                    ]);
                }
            }

            return response()->json([
                'message' => 'Connected successfully',
                'numbers' => $phones,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Connection failed: ' . $e->getMessage()], 500);
        }
    }

    public function autoConnect(Request $request)
    {
        $user = $request->user();

        $systemNumberId = SettingService::get('WHATSAPP_PHONE_NUMBER_ID') ?: config('whatsapp.phone_number_id');
        $systemWabaId = SettingService::get('WHATSAPP_WABA_ID') ?: config('whatsapp.waba_id');

        $existing = WhatsappNumber::where('owner_id', $user->id)
            ->where('phone_number_id', $systemNumberId)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already connected', 'number' => $existing]);
        }

        $number = WhatsappNumber::create([
            'owner_id' => $user->id,
            'phone_number_id' => $systemNumberId,
            'waba_id' => $systemWabaId,
            'verified' => true,
            'status' => 'verified',
            'access_token' => SettingService::get('WHATSAPP_SYSTEM_USER_TOKEN') ?: config('whatsapp.system_user_token'),
            'display_phone_number' => '+91 98765 43210',
            'verified_name' => 'V ONE DIGITALS',
        ]);

        return response()->json(['message' => 'Auto-connected successfully', 'number' => $number]);
    }

    public function disconnectNumber(Request $request, int $id)
    {
        $user = $request->user();
        $number = WhatsappNumber::where('id', $id)->first();

        if (!$number) {
            return response()->json(['error' => 'Number not found'], 404);
        }

        $number->delete();
        return response()->json(['message' => 'Number disconnected']);
    }

    public function testIncoming(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
        ]);

        $user = $request->user();

        $contact = Contact::where('owner_id', $user->id)
            ->where('phone', $validated['phone'])
            ->first();

        if (!$contact) {
            $contact = Contact::create([
                'owner_id' => $user->id,
                'name' => 'Test Contact',
                'phone' => $validated['phone'],
            ]);
        }

        Message::create([
            'owner_id' => $user->id,
            'contact_id' => $contact->id,
            'direction' => 'inbound',
            'body' => $validated['message'],
            'status' => 'received',
        ]);

        return response()->json(['message' => 'Test message saved', 'contact' => $contact]);
    }

    public function connectDirect(Request $request)
    {
        $validated = $request->validate([
            'phone_number_id' => 'required|string',
            'waba_id' => 'required|string',
            'access_token' => 'nullable|string',
        ]);

        $user = $request->user();
        $token = $validated['access_token'] ?: (SettingService::get('WHATSAPP_SYSTEM_USER_TOKEN') ?: config('whatsapp.system_user_token'));
        $issues = [];
        $displayPhoneNumber = null;
        $verifiedName = null;

        // 1. Verify phone number on Meta
        try {
            $version = SettingService::get('WHATSAPP_GRAPH_API_VERSION') ?: config('whatsapp.graph_api_version', 'v25.0');
            $verifyRes = \Illuminate\Support\Facades\Http::withToken($token)
                ->get("https://graph.facebook.com/{$version}/{$validated['phone_number_id']}");

            if ($verifyRes->successful()) {
                $displayPhoneNumber = $verifyRes->json()['display_phone_number'] ?? null;
                $verifiedName = $verifyRes->json()['verified_name'] ?? null;
            } else {
                return response()->json([
                    'error' => 'Phone Number ID is invalid or not found on Meta.',
                    'details' => $verifyRes->json()['error']['message'] ?? 'The phone number does not exist or access is denied.',
                    'fix_url' => 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
                    'fix_text' => 'Go to Meta Business Manager → WhatsApp Manager → Phone Numbers'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Phone Number ID is invalid or not found on Meta.',
                'details' => $e->getMessage(),
                'fix_url' => 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
                'fix_text' => 'Go to Meta Business Manager → WhatsApp Manager'
            ], 400);
        }

        // 2. Verify WABA & templates
        $templateCount = 0;
        $approvedTemplates = 0;
        try {
            $version = config('whatsapp.graph_api_version', 'v21.0');
            $wabaRes = \Illuminate\Support\Facades\Http::withToken($token)
                ->get("https://graph.facebook.com/{$version}/{$validated['waba_id']}/message_templates?limit=100");

            if ($wabaRes->successful()) {
                $templates = $wabaRes->json()['data'] ?? [];
                $templateCount = count($templates);
                $approvedTemplates = count(array_filter($templates, fn($t) => ($t['status'] ?? '') === 'APPROVED'));

                if ($templateCount === 0) {
                    $issues[] = [
                        'type' => 'warning',
                        'message' => 'No templates found on this WABA.',
                        'details' => 'You need at least one approved template to send messages.',
                        'fix_url' => 'https://business.facebook.com/latest/whatsapp_manager/message-templates/',
                        'fix_text' => 'Create templates in Meta Business Manager'
                    ];
                } elseif ($approvedTemplates === 0) {
                    $issues[] = [
                        'type' => 'warning',
                        'message' => "{$templateCount} template(s) found but none are approved yet.",
                        'details' => 'Templates need Meta approval before sending.',
                        'fix_url' => 'https://business.facebook.com/latest/whatsapp_manager/message-templates/',
                        'fix_text' => 'Check template status in Meta Business Manager'
                    ];
                }
            }
        } catch (\Exception $e) {
            $issues[] = [
                'type' => 'warning',
                'message' => 'WABA ID could not be fully verified.',
                'details' => $e->getMessage(),
            ];
        }

        // 3. Save or update record in DB
        $existing = WhatsappNumber::where('owner_id', $user->id)
            ->where('phone_number_id', $validated['phone_number_id'])
            ->first();

        if ($existing) {
            $existing->update([
                'waba_id' => $validated['waba_id'],
                'verified' => true,
                'status' => 'verified',
                'access_token' => $validated['access_token'] ?? $existing->access_token,
                'display_phone_number' => $displayPhoneNumber ?? $existing->display_phone_number,
                'verified_name' => $verifiedName ?? $existing->verified_name,
            ]);
            $numberRecord = $existing;
        } else {
            $numberRecord = WhatsappNumber::create([
                'owner_id' => $user->id,
                'phone_number_id' => $validated['phone_number_id'],
                'waba_id' => $validated['waba_id'],
                'verified' => true,
                'status' => 'verified',
                'access_token' => $validated['access_token'] ?? null,
                'display_phone_number' => $displayPhoneNumber,
                'verified_name' => $verifiedName,
            ]);
        }

        $hasErrorIssues = count(array_filter($issues, fn($i) => ($i['type'] ?? '') === 'error')) > 0;
        $status = $hasErrorIssues ? 'error' : (count($issues) > 0 ? 'warning' : 'success');
        $message = $status === 'success'
            ? 'WhatsApp number verified and connected successfully'
            : ($status === 'warning' ? 'WhatsApp number connected with warnings' : 'Connection failed verification');

        return response()->json([
            'status' => $status,
            'message' => $message,
            'display_phone_number' => $displayPhoneNumber,
            'verified_name' => $verifiedName,
            'template_count' => $templateCount,
            'approved_templates' => $approvedTemplates,
            'issues' => $issues,
            'number' => $numberRecord,
        ]);
    }
}

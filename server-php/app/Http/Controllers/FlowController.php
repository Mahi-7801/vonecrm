<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Flow;
use App\Models\FlowConversation;
use App\Models\FlowMessage;
use App\Services\WhatsAppService;
use App\Services\GroqAiService;

class FlowController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $flows = Flow::where('owner_id', $user->id)
            ->orWhere('is_published', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($flow) {
                if (is_string($flow->flow_json)) {
                    $flow->flow_json = json_decode($flow->flow_json, true) ?: $flow->flow_json;
                }
                return $flow;
            });

        return response()->json($flows);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $flow = Flow::where('id', $id)
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhere('is_published', true);
            })
            ->first();

        if (!$flow) {
            return response()->json(['error' => 'Flow not found'], 404);
        }

        if (is_string($flow->flow_json)) {
            $flow->flow_json = json_decode($flow->flow_json, true) ?: $flow->flow_json;
        }

        return response()->json($flow);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'flow_json' => 'nullable|array',
            'trigger_keyword' => 'nullable|string',
        ]);

        $user = $request->user();

        $defaultFlowJson = $validated['flow_json'] ?? [
            'nodes' => [
                ['id' => 'start', 'type' => 'start', 'label' => 'Start', 'x' => 100, 'y' => 100],
                ['id' => 'end', 'type' => 'end', 'label' => 'End', 'x' => 400, 'y' => 100],
            ],
            'edges' => [
                ['from' => 'start', 'to' => 'end'],
            ],
        ];

        $flow = Flow::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'flow_json' => $defaultFlowJson,
            'trigger_keyword' => $validated['trigger_keyword'] ?? null,
            'active' => false,
        ]);

        return response()->json($flow, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $flow = Flow::find($id);

        if (!$flow) {
            return response()->json(['error' => 'Flow not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'flow_json' => 'nullable|array',
            'active' => 'sometimes|boolean',
            'trigger_keyword' => 'nullable|string',
        ]);

        // If regular user trying to update admin/shared flow owned by someone else, clone it for this user!
        if ($user->role !== 'admin' && $flow->owner_id !== $user->id) {
            $userFlow = Flow::create([
                'owner_id' => $user->id,
                'name' => $validated['name'] ?? $flow->name,
                'flow_json' => $validated['flow_json'] ?? $flow->flow_json,
                'trigger_keyword' => $validated['trigger_keyword'] ?? $flow->trigger_keyword,
                'active' => $validated['active'] ?? false,
                'is_published' => false,
            ]);
            return response()->json($userFlow, 201);
        }

        $flow->update($validated);

        return response()->json($flow);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $query = Flow::where('id', $id);
        if ($user->role !== 'admin') {
            $query->where('owner_id', $user->id);
        }
        $flow = $query->first();

        if (!$flow) {
            return response()->json(['error' => 'Flow not found or unauthorized to delete'], 404);
        }

        $flow->delete();

        return response()->json(['message' => 'Flow deleted successfully']);
    }

    public function test(Request $request, int $id)
    {
        $user = $request->user();
        $flow = Flow::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$flow) {
            return response()->json(['error' => 'Flow not found'], 404);
        }

        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        // Find start node
        $startNode = collect($nodes)->firstWhere('type', 'start');
        if (!$startNode) {
            return response()->json(['error' => 'No start node found'], 400);
        }

        // Find next node
        $nextEdge = collect($edges)->firstWhere('from', $startNode['id']);
        $nextNode = $nextEdge ? collect($nodes)->firstWhere('id', $nextEdge['to']) : null;

        return response()->json([
            'start_node' => $startNode,
            'next_node' => $nextNode,
        ]);
    }

    public function execute(Request $request, int $id)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
        ]);

        $user = $request->user();
        $flow = Flow::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$flow) {
            return response()->json(['error' => 'Flow not found'], 404);
        }

        // Find or create contact
        $cleanPhone = preg_replace('/[\s\-()+]/', '', $validated['phone']);
        if (!str_starts_with($cleanPhone, '91') && strlen($cleanPhone) === 10) {
            $cleanPhone = '91' . $cleanPhone;
        }

        $contact = Contact::where('owner_id', $user->id)
            ->where('phone', $cleanPhone)
            ->first();

        if (!$contact) {
            $contact = Contact::create([
                'owner_id' => $user->id,
                'name' => 'Test Contact',
                'phone' => $cleanPhone,
            ]);
        }

        // Create conversation
        $conversation = FlowConversation::create([
            'flow_id' => $flow->id,
            'contact_id' => $contact->id,
            'owner_id' => $user->id,
            'current_node' => null,
            'context' => ['triggered_by' => 'manual_execute'],
        ]);

        // Process the flow from start
        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        $startNode = collect($nodes)->firstWhere('type', 'start');
        if (!$startNode) {
            return response()->json(['error' => 'No start node found'], 400);
        }

        $sentMessages = [];
        $currentNode = $startNode;

        while ($currentNode) {
            $nextEdge = collect($edges)->firstWhere('from', $currentNode['id']);
            if (!$nextEdge) break;

            $nextNode = collect($nodes)->firstWhere('id', $nextEdge['to']);
            if (!$nextNode) break;

            $nodeType = $nextNode['type'] ?? 'message';

            if (in_array($nodeType, ['question', 'list_message', 'reply_buttons'])) {
                $conversation->update(['current_node' => $nextNode['id']]);
                $this->sendFlowMessage($contact, $nextNode['data']['message'] ?? '', $user);
                $sentMessages[] = $nextNode['data']['message'] ?? '';

                FlowMessage::create([
                    'conversation_id' => $conversation->id,
                    'node_id' => $nextNode['id'],
                    'role' => 'assistant',
                    'content' => $nextNode['data']['message'] ?? '',
                ]);
                break;
            } elseif ($nodeType === 'ai_response') {
                $groqService = new \App\Services\GroqAiService();
                $response = $groqService->generateFlowResponse(
                    'Test message',
                    $nextNode['data']['system_prompt'] ?? 'You are a helpful assistant.'
                );

                FlowMessage::create([
                    'conversation_id' => $conversation->id,
                    'node_id' => $nextNode['id'],
                    'role' => 'assistant',
                    'content' => $response,
                ]);

                $this->sendFlowMessage($contact, $response, $user);
                $sentMessages[] = $response;
                $currentNode = $nextNode;
            } elseif ($nodeType === 'end') {
                $conversation->update(['current_node' => $nextNode['id']]);
                break;
            } else {
                if (!empty($nextNode['data']['message'])) {
                    $this->sendFlowMessage($contact, $nextNode['data']['message'], $user);
                    $sentMessages[] = $nextNode['data']['message'];

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

        return response()->json([
            'message' => 'Flow executed successfully',
            'conversation_id' => $conversation->id,
            'contact' => $contact,
            'sent_messages' => $sentMessages,
            'status' => 'completed',
        ]);
    }

    public function startConversation(Request $request, int $id)
    {
        $validated = $request->validate([
            'contact_id' => 'required|integer',
        ]);

        $user = $request->user();
        $flow = Flow::where('id', $id)->first();

        if (!$flow) {
            return response()->json(['error' => 'Flow not found'], 404);
        }

        $conversation = FlowConversation::create([
            'flow_id' => $flow->id,
            'contact_id' => $validated['contact_id'],
            'owner_id' => $user->id,
            'current_node' => null,
            'context' => [],
        ]);

        // Auto-advance to first interactive node
        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        $startNode = collect($nodes)->firstWhere('type', 'start');
        if ($startNode) {
            $nextEdge = collect($edges)->firstWhere('from', $startNode['id']);
            $nextNode = $nextEdge ? collect($nodes)->firstWhere('id', $nextEdge['to']) : null;

            if ($nextNode) {
                $conversation->update(['current_node' => $nextNode['id']]);

                // Send message if node has content
                if (!empty($nextNode['data']['message'])) {
                    $contact = \App\Models\Contact::find($validated['contact_id']);
                    if ($contact) {
                        $this->sendFlowMessage($contact, $nextNode['data']['message'], $user);
                    }

                    FlowMessage::create([
                        'conversation_id' => $conversation->id,
                        'node_id' => $nextNode['id'],
                        'role' => 'assistant',
                        'content' => $nextNode['data']['message'],
                    ]);
                }
            }
        }

        return response()->json($conversation);
    }

    public function handleButton(Request $request, int $id, int $convId)
    {
        $validated = $request->validate([
            'button_id' => 'required|string',
            'button_label' => 'nullable|string',
        ]);

        $user = $request->user();
        $conversation = FlowConversation::where('id', $convId)
            ->where('flow_id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$conversation) {
            return response()->json(['error' => 'Conversation not found'], 404);
        }

        $flow = Flow::find($id);
        $flowJson = $flow->flow_json;
        $nodes = $flowJson['nodes'] ?? [];
        $edges = $flowJson['edges'] ?? [];

        // Save user response
        FlowMessage::create([
            'conversation_id' => $conversation->id,
            'node_id' => $conversation->current_node,
            'role' => 'button_click',
            'content' => $validated['button_id'],
            'button_label' => $validated['button_label'] ?? null,
        ]);

        // Find edge from current node with matching button
        $currentNodeId = $conversation->current_node;
        $matchingEdge = collect($edges)->first(function ($edge) use ($currentNodeId, $validated) {
            return $edge['from'] === $currentNodeId &&
                (isset($edge['buttonId']) ? $edge['buttonId'] === $validated['button_id'] : true);
        });

        if ($matchingEdge) {
            $nextNode = collect($nodes)->firstWhere('id', $matchingEdge['to']);
            if ($nextNode) {
                $conversation->update(['current_node' => $nextNode['id']]);

                // Handle AI response nodes
                if (($nextNode['type'] ?? '') === 'ai_response') {
                    $groqService = new GroqAiService();
                    $contact = \App\Models\Contact::find($conversation->contact_id);

                    $response = $groqService->generateFlowResponse(
                        $validated['button_label'] ?? $validated['button_id'],
                        $nextNode['data']['system_prompt'] ?? 'You are a helpful assistant.'
                    );

                    FlowMessage::create([
                        'conversation_id' => $conversation->id,
                        'node_id' => $nextNode['id'],
                        'role' => 'assistant',
                        'content' => $response,
                    ]);

                    if ($contact) {
                        $this->sendFlowMessage($contact, $response, $user);
                    }
                } elseif (!empty($nextNode['data']['message'])) {
                    $contact = \App\Models\Contact::find($conversation->contact_id);
                    if ($contact) {
                        $this->sendFlowMessage($contact, $nextNode['data']['message'], $user);
                    }

                    FlowMessage::create([
                        'conversation_id' => $conversation->id,
                        'node_id' => $nextNode['id'],
                        'role' => 'assistant',
                        'content' => $nextNode['data']['message'],
                    ]);
                }
            }
        }

        return response()->json($conversation);
    }

    public function getConversation(Request $request, int $id, int $convId)
    {
        $user = $request->user();

        $conversation = FlowConversation::where('id', $convId)
            ->where('flow_id', $id)
            ->where('owner_id', $user->id)
            ->with('messages')
            ->first();

        if (!$conversation) {
            return response()->json(['error' => 'Conversation not found'], 404);
        }

        return response()->json($conversation);
    }

    private function sendFlowMessage($contact, string $message, $user): void
    {
        try {
            $waNumber = \App\Models\WhatsappNumber::where('owner_id', $user->id)
                ->where('verified', true)
                ->first();

            if (!$waNumber) return;

            $waService = new WhatsAppService();
            $cleanPhone = preg_replace('/[\s\-()+]/', '', $contact->phone);
            if (!str_starts_with($cleanPhone, '91') && strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }

            $token = $waNumber->access_token ?: config('whatsapp.system_user_token');
            $waService->sendTextMessage($cleanPhone, $message, $token);
        } catch (\Exception $e) {
            // Silent fail for flow messages
        }
    }
}

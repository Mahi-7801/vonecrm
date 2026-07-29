<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Agent;
use App\Models\ChatAssignment;

class AgentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $agents = Agent::where('owner_id', $user->id)->get();
        return response()->json($agents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'role' => 'nullable|string',
        ]);

        $user = $request->user();

        $agent = Agent::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'role' => $validated['role'] ?? 'support',
        ]);

        return response()->json($agent, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $agent = Agent::where('id', $id)->where('owner_id', $user->id)->first();

        if (!$agent) {
            return response()->json(['error' => 'Agent not found'], 404);
        }

        $agent->delete();
        return response()->json(['message' => 'Agent deleted']);
    }

    public function assign(Request $request)
    {
        $validated = $request->validate([
            'contact_id' => 'required|integer',
            'agent_id' => 'required|integer',
        ]);

        $user = $request->user();
        $agent = Agent::where('id', $validated['agent_id'])
            ->where('owner_id', $user->id)
            ->first();

        if (!$agent) {
            return response()->json(['error' => 'Agent not found'], 404);
        }

        // Remove existing assignment
        ChatAssignment::where('contact_id', $validated['contact_id'])->delete();

        ChatAssignment::create([
            'contact_id' => $validated['contact_id'],
            'agent_id' => $validated['agent_id'],
        ]);

        return response()->json(['message' => 'Contact assigned to agent']);
    }
}

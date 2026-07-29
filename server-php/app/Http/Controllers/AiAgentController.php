<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AiAgent;

class AiAgentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $agents = AiAgent::where('owner_id', $user->id)
            ->orWhere('is_published', true)
            ->orWhere('is_prebuilt', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($agents);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $agent = AiAgent::where('id', $id)
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhere('is_published', true);
            })
            ->first();

        if (!$agent) {
            return response()->json(['error' => 'Agent not found'], 404);
        }

        return response()->json($agent);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'nullable|string',
            'specialty' => 'nullable|string',
            'system_prompt' => 'nullable|string',
            'personality' => 'nullable|string',
            'avatar_emoji' => 'nullable|string|max:10',
        ]);

        $user = $request->user();

        $agent = AiAgent::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'role' => $validated['role'] ?? null,
            'specialty' => $validated['specialty'] ?? null,
            'system_prompt' => $validated['system_prompt'] ?? null,
            'personality' => $validated['personality'] ?? null,
            'avatar_emoji' => $validated['avatar_emoji'] ?? '🤖',
        ]);

        return response()->json($agent, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $agent = AiAgent::find($id);

        if (!$agent) {
            return response()->json(['error' => 'Agent not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'role' => 'nullable|string',
            'specialty' => 'nullable|string',
            'system_prompt' => 'nullable|string',
            'personality' => 'nullable|string',
            'avatar_emoji' => 'nullable|string|max:10',
        ]);

        // If non-admin user trying to update shared/prebuilt agent, clone for user
        if ($user->role !== 'admin' && $agent->owner_id !== $user->id) {
            $userAgent = AiAgent::create([
                'owner_id' => $user->id,
                'name' => $validated['name'] ?? $agent->name,
                'role' => $validated['role'] ?? $agent->role,
                'specialty' => $validated['specialty'] ?? $agent->specialty,
                'system_prompt' => $validated['system_prompt'] ?? $agent->system_prompt,
                'personality' => $validated['personality'] ?? $agent->personality,
                'avatar_emoji' => $validated['avatar_emoji'] ?? $agent->avatar_emoji,
                'is_published' => false,
                'is_prebuilt' => false,
            ]);
            return response()->json($userAgent, 201);
        }

        $agent->update($validated);

        return response()->json($agent);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $query = AiAgent::where('id', $id);
        if ($user->role !== 'admin') {
            $query->where('owner_id', $user->id)->where('is_prebuilt', false);
        }
        $agent = $query->first();

        if (!$agent) {
            return response()->json(['error' => 'Agent not found or unauthorized to delete prebuilt agent'], 404);
        }

        if ($agent->is_prebuilt && $user->role !== 'admin') {
            return response()->json(['error' => 'Cannot delete prebuilt agent'], 400);
        }

        $agent->delete();

        return response()->json(['message' => 'Agent deleted successfully']);
    }
}

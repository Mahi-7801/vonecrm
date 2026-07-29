<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CannedResponse;

class CannedResponseController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $responses = CannedResponse::where('owner_id', $user->id)
            ->orWhere(function ($q) {
                $q->where('published', true)
                    ->where('is_preset', true);
            })
            ->get();

        return response()->json($responses);
    }

    public function presets(Request $request)
    {
        $presets = CannedResponse::where('is_preset', true)
            ->where('published', true)
            ->get();

        return response()->json($presets);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shortcut' => 'required|string|max:50',
            'message' => 'required|string',
            'category' => 'nullable|string',
        ]);

        $user = $request->user();

        $response = CannedResponse::create([
            'owner_id' => $user->id,
            'shortcut' => $validated['shortcut'],
            'message' => $validated['message'],
            'category' => $validated['category'] ?? null,
        ]);

        return response()->json($response, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $response = CannedResponse::where('id', $id)->where('owner_id', $user->id)->first();

        if (!$response) {
            return response()->json(['error' => 'Response not found'], 404);
        }

        $validated = $request->validate([
            'shortcut' => 'sometimes|string|max:50',
            'message' => 'sometimes|string',
            'category' => 'nullable|string',
        ]);

        $response->update($validated);

        return response()->json($response);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $response = CannedResponse::where('id', $id)->where('owner_id', $user->id)->first();

        if (!$response) {
            return response()->json(['error' => 'Response not found'], 404);
        }

        $response->delete();
        return response()->json(['message' => 'Response deleted']);
    }
}

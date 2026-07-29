<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DripSequence;

class DripSequenceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $sequences = DripSequence::where('owner_id', $user->id)
            ->orWhereHas('owner', function ($q) {
                $q->where('role', 'admin');
            })
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($sequences);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'steps' => 'nullable|array',
        ]);

        $user = $request->user();

        $sequence = DripSequence::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'steps' => $validated['steps'] ?? [],
        ]);

        return response()->json($sequence, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $sequence = DripSequence::find($id);

        if (!$sequence) {
            return response()->json(['error' => 'Sequence not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'steps' => 'nullable|array',
            'active' => 'sometimes|boolean',
        ]);

        // If non-admin user trying to update shared/admin sequence, clone for user
        if ($user->role !== 'admin' && $sequence->owner_id !== $user->id) {
            $userSeq = DripSequence::create([
                'owner_id' => $user->id,
                'name' => $validated['name'] ?? $sequence->name,
                'steps' => $validated['steps'] ?? $sequence->steps,
                'active' => $validated['active'] ?? false,
            ]);
            return response()->json($userSeq, 201);
        }

        $sequence->update($validated);

        return response()->json($sequence);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $query = DripSequence::where('id', $id);
        if ($user->role !== 'admin') {
            $query->where('owner_id', $user->id);
        }
        $sequence = $query->first();

        if (!$sequence) {
            return response()->json(['error' => 'Sequence not found or unauthorized to delete'], 404);
        }

        $sequence->delete();
        return response()->json(['message' => 'Sequence deleted successfully']);
    }
}

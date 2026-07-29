<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Contact;
use App\Models\ContactLabel;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $contacts = Contact::where('owner_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($contacts);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $contact = Contact::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['error' => 'Contact not found'], 404);
        }

        return response()->json($contact);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'tags' => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ]);

        $user = $request->user();

        $contact = Contact::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'tags' => $validated['tags'] ?? null,
            'custom_fields' => $validated['custom_fields'] ?? null,
        ]);

        // Auto-register phone with Meta Graph API (best effort)
        try {
            $waNumber = WhatsappNumber::where('owner_id', $user->id)
                ->where('verified', true)
                ->first();

            if ($waNumber) {
                $waService = new WhatsAppService();
                // Register contact with Meta
            }
        } catch (\Exception $e) {
            // Silent fail for Meta registration
        }

        return response()->json($contact, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $contact = Contact::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['error' => 'Contact not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'tags' => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ]);

        $contact->update($validated);

        return response()->json($contact);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $contact = Contact::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['error' => 'Contact not found'], 404);
        }

        // Cascading delete
        DB::statement("DELETE FROM flow_messages WHERE conversation_id IN (SELECT id FROM flow_conversations WHERE contact_id = ?)", [$id]);
        DB::statement("DELETE FROM flow_conversations WHERE contact_id = ?", [$id]);
        DB::statement("DELETE FROM flow_runs WHERE contact_id = ?", [$id]);
        DB::statement("DELETE FROM chat_assignments WHERE contact_id = ?", [$id]);
        DB::statement("DELETE FROM usage_log WHERE message_id IN (SELECT id FROM messages WHERE contact_id = ?)", [$id]);
        DB::statement("DELETE FROM messages WHERE contact_id = ?", [$id]);
        $contact->delete();

        return response()->json(['message' => 'Contact deleted successfully']);
    }

    public function import(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getPathname(), 'r');
        $headers = fgetcsv($handle);

        $imported = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($headers, $row);
            $phone = $data['phone'] ?? $data['Phone'] ?? null;
            $name = $data['name'] ?? $data['Name'] ?? 'Unknown';

            if (!$phone) {
                $skipped++;
                continue;
            }

            $exists = Contact::where('owner_id', $user->id)
                ->where('phone', $phone)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            Contact::create([
                'owner_id' => $user->id,
                'name' => $name,
                'phone' => $phone,
                'tags' => !empty($data['tags']) ? array_map('trim', explode(',', $data['tags'])) : null,
            ]);

            $imported++;
        }

        fclose($handle);

        return response()->json([
            'message' => "Import completed. Imported: {$imported}, Skipped: {$skipped}",
            'imported' => $imported,
            'skipped' => $skipped,
        ]);
    }

    public function labels(Request $request)
    {
        $user = $request->user();
        $labels = ContactLabel::where('owner_id', $user->id)->get();
        return response()->json($labels);
    }

    public function createLabel(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:7',
        ]);

        $user = $request->user();

        $label = ContactLabel::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#3B82F6',
        ]);

        return response()->json($label, 201);
    }

    public function deleteLabel(Request $request, int $id)
    {
        $user = $request->user();
        $label = ContactLabel::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$label) {
            return response()->json(['error' => 'Label not found'], 404);
        }

        $label->delete();
        return response()->json(['message' => 'Label deleted']);
    }

    public function assignLabel(Request $request, int $id)
    {
        $validated = $request->validate([
            'label_id' => 'required|integer',
        ]);

        $user = $request->user();
        $contact = Contact::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['error' => 'Contact not found'], 404);
        }

        $contact->update(['label_id' => $validated['label_id']]);

        return response()->json($contact);
    }
}

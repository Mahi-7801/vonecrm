<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Template;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;

class TemplateController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $templates = Template::whereNull('deleted_at')
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhere('is_published', true);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:marketing,utility,authentication',
            'language' => 'nullable|string|max:10',
            'header' => 'nullable|string',
            'body' => 'required|string',
            'footer' => 'nullable|string',
            'buttons' => 'nullable|array',
        ]);

        $user = $request->user();

        $template = Template::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'language' => $validated['language'] ?? 'en_US',
            'header' => $validated['header'] ?? null,
            'body' => $validated['body'],
            'footer' => $validated['footer'] ?? null,
            'buttons' => $validated['buttons'] ?? null,
            'status' => 'pending',
        ]);

        // Auto-submit to Meta
        $this->submitToMeta($template);

        return response()->json($template, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $template = Template::where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|in:marketing,utility,authentication',
            'language' => 'sometimes|string|max:10',
            'header' => 'nullable|string',
            'body' => 'sometimes|string',
            'footer' => 'nullable|string',
            'buttons' => 'nullable|array',
        ]);

        // If non-admin user trying to update shared/published template owned by someone else, clone for user
        if ($user->role !== 'admin' && $template->owner_id !== $user->id) {
            $userTpl = Template::create([
                'owner_id' => $user->id,
                'name' => $validated['name'] ?? $template->name,
                'category' => $validated['category'] ?? $template->category,
                'language' => $validated['language'] ?? $template->language,
                'header' => $validated['header'] ?? $template->header,
                'body' => $validated['body'] ?? $template->body,
                'footer' => $validated['footer'] ?? $template->footer,
                'buttons' => $validated['buttons'] ?? $template->buttons,
                'status' => 'pending',
                'is_published' => false,
            ]);
            return response()->json($userTpl, 201);
        }

        $template->update($validated);

        return response()->json($template);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $query = Template::where('id', $id);
        if ($user->role !== 'admin') {
            $query->where('owner_id', $user->id);
        }
        $template = $query->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found or unauthorized to delete'], 404);
        }

        $template->delete(); // Soft delete

        return response()->json(['message' => 'Template deleted successfully']);
    }

    public function submitToMetaEndpoint(Request $request, int $id)
    {
        $user = $request->user();
        $template = Template::where('id', $id)
            ->where('owner_id', $user->id)
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $result = $this->submitToMeta($template);

        return response()->json([
            'message' => 'Template submitted to Meta',
            'result' => $result,
        ]);
    }

    public function syncFromMeta(Request $request)
    {
        $user = $request->user();
        $waService = new WhatsAppService();

        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        $wabaId = $waNumber ? ($waNumber->waba_id ?: $waNumber->phone_number_id) : null;

        try {
            $metaTemplates = $waService->getTemplateStatus($wabaId);
            $data = $metaTemplates['data'] ?? [];

            $synced = 0;
            foreach ($data as $metaTpl) {
                $existing = Template::where('owner_id', $user->id)
                    ->where('name', $metaTpl['name'])
                    ->first();

                if ($existing) {
                    $existing->update([
                        'status' => strtolower($metaTpl['status'] ?? 'pending'),
                        'meta_template_id' => $metaTpl['id'] ?? null,
                        'is_published' => true,
                    ]);
                    $synced++;
                } else {
                    // Extract body text from components
                    $bodyText = '';
                    $headerText = null;
                    $footerText = null;
                    foreach ($metaTpl['components'] ?? [] as $comp) {
                        if (($comp['type'] ?? '') === 'BODY') $bodyText = $comp['text'] ?? '';
                        if (($comp['type'] ?? '') === 'HEADER') $headerText = $comp['text'] ?? null;
                        if (($comp['type'] ?? '') === 'FOOTER') $footerText = $comp['text'] ?? null;
                    }

                    Template::create([
                        'owner_id' => $user->id,
                        'name' => $metaTpl['name'],
                        'category' => strtolower($metaTpl['category'] ?? 'utility'),
                        'language' => $metaTpl['language'] ?? 'en_US',
                        'header' => $headerText,
                        'body' => $bodyText ?: "Template {$metaTpl['name']}",
                        'footer' => $footerText,
                        'status' => strtolower($metaTpl['status'] ?? 'approved'),
                        'meta_template_id' => $metaTpl['id'] ?? null,
                        'is_published' => true,
                    ]);
                    $synced++;
                }
            }

            return response()->json([
                'message' => "Synced {$synced} templates from Meta",
                'meta_templates' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to sync: ' . $e->getMessage()], 500);
        }
    }

    public function metaTemplates(Request $request)
    {
        $user = $request->user();
        $waService = new WhatsAppService();

        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        $wabaId = $waNumber ? ($waNumber->waba_id ?: $waNumber->phone_number_id) : null;

        try {
            $result = $waService->getTemplateStatus($wabaId);
            $data = isset($result['data']) ? $result['data'] : (is_array($result) ? $result : []);
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function submitToMeta(Template $template): array
    {
        $waService = new WhatsAppService();

        try {
            $result = $waService->submitTemplateToMeta([
                'name' => $template->name,
                'category' => $template->category,
                'language' => $template->language,
                'header' => $template->header,
                'body' => $template->body,
                'footer' => $template->footer,
                'buttons' => $template->buttons,
            ]);

            if (isset($result['id'])) {
                $template->update([
                    'status' => 'pending',
                    'meta_template_id' => $result['id'],
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}

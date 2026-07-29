<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Contact;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Models\UsageLog;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $contacts = Contact::where('owner_id', $user->id)->count();

        $chats = Message::where('owner_id', $user->id)
            ->select('contact_id')
            ->distinct()
            ->count('contact_id');

        $monthlyUsage = UsageLog::where('owner_id', $user->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('cost');

        $verifiedNumbers = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->count();

        // Daily message counts for last 7 days
        $dailyMessages = Message::where('owner_id', $user->id)
            ->where('created_at', '>=', now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Recent messages
        $recentMessages = Message::with('contact:id,name,phone')
            ->where('owner_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($msg) => [
                'id' => $msg->id,
                'body' => $msg->body,
                'direction' => $msg->direction,
                'status' => $msg->status,
                'created_at' => $msg->created_at,
                'contact_name' => $msg->contact->name ?? null,
                'contact_phone' => $msg->contact->phone ?? null,
            ]);

        // Message category breakdown
        $categoryBreakdown = Message::where('messages.owner_id', $user->id)
            ->where('messages.direction', 'outbound')
            ->leftJoin('templates', 'messages.template_id', '=', 'templates.id')
            ->select(DB::raw('COALESCE(templates.category, "message") as category'), DB::raw('COUNT(*) as count'))
            ->groupBy('category')
            ->get();

        return response()->json([
            'balance' => $user->balance,
            'credit_mode' => $user->credit_mode,
            'total_contacts' => $contacts,
            'active_chats' => $chats,
            'monthly_usage' => $monthlyUsage,
            'verified_numbers' => $verifiedNumbers,
            'daily_messages' => $dailyMessages,
            'recent_messages' => $recentMessages,
            'message_categories' => $categoryBreakdown,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Contact;
use App\Models\WhatsappNumber;
use App\Services\RazorpayService;
use App\Services\EmailService;
use App\Services\WhatsAppService;

class PlanController extends Controller
{
    public function index()
    {
        $plans = Plan::where('active', true)->orderBy('price')->get();
        return response()->json($plans);
    }

    public function all(Request $request)
    {
        $this->authorizeAdmin($request);

        $plans = Plan::orderBy('created_at', 'desc')->get();
        return response()->json($plans);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'max_messages' => 'nullable|integer|min:0',
            'max_contacts' => 'nullable|integer|min:0',
            'features' => 'nullable|array',
        ]);

        $plan = Plan::create($validated);

        return response()->json($plan, 201);
    }

    public function update(Request $request, int $id)
    {
        $this->authorizeAdmin($request);

        $plan = Plan::find($id);
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'duration_days' => 'sometimes|integer|min:1',
            'max_messages' => 'nullable|integer|min:0',
            'max_contacts' => 'nullable|integer|min:0',
            'features' => 'nullable|array',
            'active' => 'sometimes|boolean',
        ]);

        $plan->update($validated);

        return response()->json($plan);
    }

    public function destroy(Request $request, int $id)
    {
        $this->authorizeAdmin($request);

        $plan = Plan::find($id);
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $plan->delete();

        return response()->json(['message' => 'Plan deleted']);
    }

    public function createOrder(Request $request, int $id)
    {
        $plan = Plan::where('id', $id)->where('active', true)->first();
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $user = $request->user();
        $razorpayService = new RazorpayService();

        $receipt = "plan_{$plan->id}_user_{$user->id}_" . time();
        $order = $razorpayService->createOrder($plan->price, $receipt, [
            'plan_id' => $plan->id,
            'user_id' => $user->id,
        ]);

        if (!$order) {
            return response()->json(['error' => 'Failed to create order'], 500);
        }

        return response()->json([
            'order_id' => $order['id'],
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'key' => config('razorpay.key_id'),
            'plan' => $plan,
        ]);
    }

    public function verifyPayment(Request $request)
    {
        $validated = $request->validate([
            'razorpay_order_id' => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        $user = $request->user();
        $razorpayService = new RazorpayService();

        $isValid = $razorpayService->verifyPayment(
            $validated['razorpay_order_id'],
            $validated['razorpay_payment_id'],
            $validated['razorpay_signature']
        );

        if (!$isValid) {
            return response()->json(['error' => 'Payment verification failed'], 400);
        }

        // Check duplicate
        $existing = Subscription::where('payment_id', $validated['razorpay_payment_id'])->first();
        if ($existing) {
            return response()->json(['error' => 'Payment already processed'], 400);
        }

        // Fetch order to get plan info
        $order = $razorpayService->fetchOrder($validated['razorpay_order_id']);
        $planId = $order['notes']['plan_id'] ?? null;

        if (!$planId) {
            return response()->json(['error' => 'Invalid order'], 400);
        }

        $plan = Plan::find($planId);
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 400);
        }

        // Cancel existing active subscription
        Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'expired']);

        // Create subscription
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => now()->addDays($plan->duration_days),
            'payment_id' => $validated['razorpay_payment_id'],
        ]);

        // Send confirmation email
        $emailService = new EmailService();
        $emailService->sendPaymentConfirmation(
            $user->email,
            $user->email,
            [
                'amount' => $plan->price,
                'plan_name' => $plan->name,
                'expires_at' => $subscription->expires_at->format('Y-m-d'),
                'payment_id' => $validated['razorpay_payment_id'],
            ]
        );

        // Auto-register contacts with Meta (best effort)
        try {
            $this->autoRegisterContacts($user);
        } catch (\Exception $e) {
            // Silent fail
        }

        return response()->json([
            'message' => 'Subscription activated successfully',
            'subscription' => $subscription->load('plan'),
        ]);
    }

    public function subscribeByBalance(Request $request, int $id)
    {
        $plan = Plan::where('id', $id)->where('active', true)->first();
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $user = $request->user();

        if ($user->balance < $plan->price) {
            return response()->json(['error' => 'Insufficient balance'], 400);
        }

        // Cancel existing
        Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'expired']);

        // Deduct balance
        $user->decrement('balance', $plan->price);

        // Create subscription
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => now()->addDays($plan->duration_days),
            'payment_id' => null,
        ]);

        return response()->json([
            'message' => 'Subscription activated via balance',
            'subscription' => $subscription->load('plan'),
            'new_balance' => $user->fresh()->balance,
        ]);
    }

    public function mySubscription(Request $request)
    {
        $user = $request->user();

        $subscription = Subscription::with('plan')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->first();

        return response()->json($subscription);
    }

    public function adminSubscriptions(Request $request)
    {
        $this->authorizeAdmin($request);

        $subscriptions = Subscription::with(['user', 'plan'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($subscriptions);
    }

    private function autoRegisterContacts($user): void
    {
        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        if (!$waNumber) return;

        $contacts = Contact::where('owner_id', $user->id)->get();
        $waService = new WhatsAppService();
        $token = $waNumber->access_token ?: config('whatsapp.system_user_token');

        foreach ($contacts as $contact) {
            try {
                $cleanPhone = preg_replace('/[\s\-()+]/', '', $contact->phone);
                if (!str_starts_with($cleanPhone, '91') && strlen($cleanPhone) === 10) {
                    $cleanPhone = '91' . $cleanPhone;
                }
                // Best effort registration
            } catch (\Exception $e) {
                // Silent fail
            }
        }
    }

    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Admin access required');
        }
    }
}

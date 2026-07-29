<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UsageLog;
use App\Models\Payment;
use App\Models\PricingConfig;
use App\Services\RazorpayService;
use App\Services\EmailService;

class BillingController extends Controller
{
    public function usage(Request $request)
    {
        $user = $request->user();
        $period = $request->query('period', 'all');

        $query = UsageLog::where('owner_id', $user->id);

        switch ($period) {
            case 'daily':
                $query->whereDate('created_at', now()->toDateString());
                break;
            case 'weekly':
                $query->where('created_at', '>=', now()->subWeek());
                break;
            case 'monthly':
                $query->where('created_at', '>=', now()->subMonth());
                break;
        }

        $logs = $query->get();

        $breakdown = $logs->groupBy('category')->map(fn($items) => [
            'count' => $items->count(),
            'total' => $items->sum('cost'),
        ]);

        return response()->json([
            'usage' => $logs,
            'breakdown' => $breakdown,
            'total' => $logs->sum('cost'),
            'balance' => $user->balance,
            'credit_mode' => $user->credit_mode,
        ]);
    }

    public function payments(Request $request)
    {
        $user = $request->user();

        $payments = Payment::where('owner_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($payments);
    }

    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $user = $request->user();
        $razorpayService = new RazorpayService();

        $receipt = "user_{$user->id}_" . time();
        $order = $razorpayService->createOrder($validated['amount'], $receipt);

        if (!$order) {
            return response()->json(['error' => 'Failed to create order'], 500);
        }

        return response()->json([
            'order_id' => $order['id'],
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'key' => config('razorpay.key_id'),
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

        // Check for duplicate payment
        $existing = Payment::where('razorpay_payment_id', $validated['razorpay_payment_id'])->first();
        if ($existing) {
            return response()->json(['error' => 'Payment already processed'], 400);
        }

        // Fetch order to get amount
        $order = $razorpayService->fetchOrder($validated['razorpay_order_id']);
        $amount = ($order['amount'] ?? 0) / 100;

        // Create payment record
        $payment = Payment::create([
            'owner_id' => $user->id,
            'amount' => $amount,
            'method' => 'razorpay',
            'razorpay_payment_id' => $validated['razorpay_payment_id'],
        ]);

        // Credit balance
        $user->increment('balance', $amount);

        // Send confirmation email
        $emailService = new EmailService();
        $emailService->sendPaymentConfirmation(
            $user->email,
            $user->email,
            [
                'amount' => $amount,
                'plan_name' => 'Wallet Recharge',
                'expires_at' => 'N/A',
                'payment_id' => $validated['razorpay_payment_id'],
            ]
        );

        return response()->json([
            'message' => 'Payment verified successfully',
            'payment' => $payment,
            'new_balance' => $user->fresh()->balance,
        ]);
    }

    public function razorpayWebhook(Request $request)
    {
        $body = $request->all();

        if (($body['event'] ?? '') === 'payment.captured') {
            $paymentData = $body['payload']['payment']['entity'] ?? null;
            if ($paymentData) {
                $receipt = $paymentData['notes']['user_id'] ?? null;
                if ($receipt) {
                    $userId = (int) str_replace('user_', '', $receipt);
                    $user = User::find($userId);
                    if ($user) {
                        $amount = ($paymentData['amount'] ?? 0) / 100;
                        $user->increment('balance', $amount);

                        Payment::create([
                            'owner_id' => $user->id,
                            'amount' => $amount,
                            'method' => 'razorpay',
                            'razorpay_payment_id' => $paymentData['id'] ?? null,
                        ]);
                    }
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }
}

<?php

namespace App\Services;

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;
use Illuminate\Support\Facades\Log;

use App\Services\SettingService;

class RazorpayService
{
    private Api $api;

    public function __construct()
    {
        $keyId = SettingService::get('RAZORPAY_KEY_ID') ?: (config('razorpay.key_id') ?: env('RAZORPAY_KEY_ID', ''));
        $keySecret = SettingService::get('RAZORPAY_KEY_SECRET') ?: (config('razorpay.key_secret') ?: env('RAZORPAY_KEY_SECRET', ''));
        $this->api = new Api($keyId, $keySecret);
    }

    public function createOrder(float $amount, string $receipt, array $notes = []): ?array
    {
        try {
            $orderData = [
                'amount' => (int) ($amount * 100), // Razorpay expects paise
                'currency' => config('razorpay.currency', 'INR'),
                'receipt' => $receipt,
                'notes' => $notes,
            ];

            $order = $this->api->order->create($orderData);

            return [
                'id' => $order['id'],
                'amount' => $order['amount'],
                'currency' => $order['currency'],
                'receipt' => $order['receipt'],
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay order creation failed: ' . $e->getMessage());
            return null;
        }
    }

    public function verifyPayment(string $razorpayOrderId, string $razorpayPaymentId, string $razorpaySignature): bool
    {
        try {
            $attributes = [
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => $razorpayPaymentId,
                'razorpay_signature' => $razorpaySignature,
            ];

            $this->api->utility->verifySignedUrl($attributes);
            return true;
        } catch (SignatureVerificationError $e) {
            Log::error('Razorpay signature verification failed: ' . $e->getMessage());
            return false;
        }
    }

    public function fetchPayment(string $paymentId): ?array
    {
        try {
            $payment = $this->api->payment->fetch($paymentId);
            return $payment->json();
        } catch (\Exception $e) {
            Log::error('Razorpay fetch payment failed: ' . $e->getMessage());
            return null;
        }
    }

    public function fetchOrder(string $orderId): ?array
    {
        try {
            $order = $this->api->order->fetch($orderId);
            return $order->json();
        } catch (\Exception $e) {
            Log::error('Razorpay fetch order failed: ' . $e->getMessage());
            return null;
        }
    }
}

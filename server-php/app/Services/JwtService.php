<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;

class JwtService
{
    private string $secret;
    private int $expiry;
    private string $algo;

    public function __construct()
    {
        $this->secret = config('jwt.secret');
        $this->expiry = config('jwt.expiry');
        $this->algo = config('jwt.algo', 'HS256');
    }

    public function generateToken(User $user): string
    {
        $now = time();
        $payload = [
            'iss' => config('app.url', 'whatsapp-crm'),
            'iat' => $now,
            'exp' => $now + $this->expiry,
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
        ];

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    public function decodeToken(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algo));
        } catch (\Exception $e) {
            return null;
        }
    }

    public function getUserIdFromToken(string $token): ?int
    {
        $decoded = $this->decodeToken($token);
        return $decoded->sub ?? null;
    }
}

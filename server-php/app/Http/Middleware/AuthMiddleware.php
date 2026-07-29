<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\JwtService;
use App\Models\User;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['error' => 'No token provided'], 401);
        }

        $token = substr($authHeader, 7);

        $jwtService = new JwtService();
        $userId = $jwtService->getUserIdFromToken($token);

        if (!$userId) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        $user = User::find($userId);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 401);
        }

        $request->merge(['user' => $user]);
        $request->setUserResolver(fn() => $user);

        return $next($request);
    }
}

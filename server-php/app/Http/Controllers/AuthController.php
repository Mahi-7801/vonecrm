<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Services\JwtService;

class AuthController extends Controller
{
    public function signup(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'role' => 'client',
            'balance' => 0,
            'credit_mode' => 'postpaid',
        ]);

        $jwtService = new JwtService();
        $token = $jwtService->generateToken($user);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'balance' => $user->balance,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $jwtService = new JwtService();
        $token = $jwtService->generateToken($user);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'balance' => $user->balance,
                'credit_mode' => $user->credit_mode,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function adminLogin(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Admin access only'], 403);
        }

        $jwtService = new JwtService();
        $token = $jwtService->generateToken($user);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'balance' => $user->balance,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'balance' => $user->balance,
            'credit_mode' => $user->credit_mode,
            'created_at' => $user->created_at,
        ]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        $user->update([
            'password_hash' => Hash::make($validated['new_password']),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }
}

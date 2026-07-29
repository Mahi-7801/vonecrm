<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'password_hash',
        'role',
        'balance',
        'credit_mode',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
    ];

    public function whatsappNumbers()
    {
        return $this->hasMany(WhatsappNumber::class, 'owner_id');
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class, 'owner_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'owner_id');
    }

    public function templates()
    {
        return $this->hasMany(Template::class, 'owner_id');
    }

    public function flows()
    {
        return $this->hasMany(Flow::class, 'owner_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'user_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'owner_id');
    }

    public function usageLogs()
    {
        return $this->hasMany(UsageLog::class, 'owner_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class, 'user_id')
            ->where('status', 'active')
            ->where('expires_at', '>', now());
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappNumber extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'phone_number_id',
        'waba_id',
        'verified',
        'status',
        'access_token',
        'display_phone_number',
        'verified_name',
        'added_by',
    ];

    protected $casts = [
        'verified' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}

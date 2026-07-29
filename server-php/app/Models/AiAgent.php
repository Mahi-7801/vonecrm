<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiAgent extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'role',
        'specialty',
        'system_prompt',
        'personality',
        'avatar_emoji',
        'is_published',
        'is_prebuilt',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_prebuilt' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}

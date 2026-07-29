<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UsageLog extends Model
{
    use HasFactory;

    protected $table = 'usage_log';

    protected $fillable = [
        'owner_id',
        'message_id',
        'category',
        'cost',
    ];

    protected $casts = [
        'cost' => 'decimal:4',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function message()
    {
        return $this->belongsTo(Message::class, 'message_id');
    }
}

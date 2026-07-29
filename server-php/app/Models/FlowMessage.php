<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlowMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'node_id',
        'role',
        'content',
        'button_label',
        'ai_context',
    ];

    protected $casts = [
        'ai_context' => 'array',
    ];

    public function conversation()
    {
        return $this->belongsTo(FlowConversation::class, 'conversation_id');
    }
}

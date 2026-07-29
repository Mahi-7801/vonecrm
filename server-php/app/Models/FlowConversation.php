<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlowConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'contact_id',
        'owner_id',
        'current_node',
        'context',
    ];

    protected $casts = [
        'context' => 'array',
    ];

    public function flow()
    {
        return $this->belongsTo(Flow::class, 'flow_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function messages()
    {
        return $this->hasMany(FlowMessage::class, 'conversation_id');
    }
}

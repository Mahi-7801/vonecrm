<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'phone',
        'tags',
        'custom_fields',
        'label',
        'label_id',
    ];

    protected $casts = [
        'tags' => 'array',
        'custom_fields' => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'contact_id');
    }

    public function flowConversations()
    {
        return $this->hasMany(FlowConversation::class, 'contact_id');
    }

    public function flowRuns()
    {
        return $this->hasMany(FlowRun::class, 'contact_id');
    }

    public function chatAssignments()
    {
        return $this->hasMany(ChatAssignment::class, 'contact_id');
    }

    public function labelRel()
    {
        return $this->belongsTo(ContactLabel::class, 'label_id');
    }
}

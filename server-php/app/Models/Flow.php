<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Flow extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'flow_json',
        'active',
        'is_published',
        'trigger_keyword',
    ];

    protected $casts = [
        'flow_json' => 'array',
        'active' => 'boolean',
        'is_published' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function runs()
    {
        return $this->hasMany(FlowRun::class, 'flow_id');
    }

    public function conversations()
    {
        return $this->hasMany(FlowConversation::class, 'flow_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}

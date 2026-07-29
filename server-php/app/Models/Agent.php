<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'email',
        'role',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function chatAssignments()
    {
        return $this->hasMany(ChatAssignment::class, 'agent_id');
    }
}

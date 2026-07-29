<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlowRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'contact_id',
        'current_node',
        'state',
    ];

    protected $casts = [
        'state' => 'array',
    ];

    public function flow()
    {
        return $this->belongsTo(Flow::class, 'flow_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }
}

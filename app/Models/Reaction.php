<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reaction extends Model
{
    public const TYPES = ['satisfied', 'not_satisfied'];

    protected $table = 'complaint_reactions';

    protected $fillable = ['complaint_id', 'user_id', 'type'];
}

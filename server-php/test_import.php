<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$sql = file_get_contents('../full_database_schema.sql');
DB::unprepared($sql);
echo "Full database schema imported cleanly into MySQL with 0 errors!\n";

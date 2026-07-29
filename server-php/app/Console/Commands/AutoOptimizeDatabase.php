<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;

class AutoOptimizeDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:auto-optimize-database';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-optimize MySQL database tables, clear expired cache, and boost performance without removing user data.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Database & Application Auto-Optimization...');

        $startTime = microtime(true);

        // 1. Clear expired application & view caches (No user data removed)
        try {
            Cache::flush();
            Artisan::call('view:clear');
            Artisan::call('cache:clear');
            $this->info('✓ Application & View cache cleared successfully.');
        } catch (\Exception $e) {
            $this->error('Cache clear warning: ' . $e->getMessage());
        }

        // 2. Fetch all database tables in active schema
        $optimizedTables = [];
        try {
            $tables = DB::select('SHOW TABLES');
            $dbName = config('database.connections.mysql.database', 'whatsapp_crm');
            $keyName = 'Tables_in_' . $dbName;

            foreach ($tables as $tableObj) {
                $tableName = $tableObj->$keyName ?? null;
                if (!$tableName) {
                    $vars = get_object_vars($tableObj);
                    $tableName = reset($vars);
                }

                if ($tableName) {
                    // Optimize MySQL table index and defragment data pages
                    DB::statement("OPTIMIZE TABLE `{$tableName}`");
                    $optimizedTables[] = $tableName;
                }
            }
            $this->info('✓ Optimized ' . count($optimizedTables) . ' database tables.');
        } catch (\Exception $e) {
            $this->error('Database table optimization error: ' . $e->getMessage());
        }

        $elapsed = round(microtime(true) - $startTime, 3);
        $this->info("✓ Auto-optimization completed in {$elapsed} seconds without deleting any data.");

        return Command::SUCCESS;
    }
}

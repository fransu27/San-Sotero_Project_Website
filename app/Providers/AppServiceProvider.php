<?php

namespace App\Providers;

use App\Models\Complaint;
use App\Policies\ComplaintPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // Object-level authorization rules for complaints live in one class (auto-discovery would find it too;
        // being explicit makes it obvious when reading this file).
        Gate::policy(Complaint::class, ComplaintPolicy::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Password policy (same rule in every environment, so what you test is what production enforces):
        //   at least 8 characters, upper AND lower case letters, and a number.
        // Production additionally rejects passwords found in known data breaches.
        Password::defaults(fn (): Password => app()->isProduction()
            ? Password::min(8)->mixedCase()->letters()->numbers()->uncompromised()
            : Password::min(8)->mixedCase()->letters()->numbers(),
        );
    }
}

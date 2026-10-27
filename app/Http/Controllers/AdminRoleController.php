<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminRoleController extends Controller
{
    public function update(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->isPrimaryAdmin(), 403, 'Only the primary administrator can assign administrator roles.');
        abort_if($user->isPrimaryAdmin(), 422, 'The primary administrator role cannot be changed.');
        abort_if($actor->is($user), 422, 'You cannot change your own administrator role here.');

        $data = $request->validate(['role' => ['required', Rule::in(['admin', 'resident'])]]);
        $user->forceFill(['role' => $data['role'], 'is_primary_admin' => false])->save();

        return back()->with('status', $data['role'] === 'admin' ? 'Administrator role assigned.' : 'Administrator role removed.');
    }
}

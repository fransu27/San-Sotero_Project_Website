<?php

namespace App\Policies;

use App\Models\Complaint;
use App\Models\User;

/**
 * WHO may do WHAT to a complaint. Controllers call Gate::authorize('ability', $complaint) (or $this->authorize),
 * so every rule is written once, here, and cannot be skipped by tampering with the React code or the URL.
 *
 * Route-model binding will load ANY complaint id from the URL — that is why each action needs an
 * object-level check like these (this is what prevents IDOR: "Insecure Direct Object Reference").
 *
 * Roles: admin = barangay official; everybody else = resident. `role` is not mass-assignable, so it cannot be forged.
 */
class ComplaintPolicy
{
    /**
     * May see the post at all?
     *   admin: always · author: always ·
     *   other residents: only if it is public AND an admin approved it AND it has not been removed.
     * (Same rule as Complaint::scopeVisibleTo, which filters the feed query.)
     */
    public function view(User $user, Complaint $complaint): bool
    {
        return $user->isAdmin() || $complaint->user_id === $user->id || $complaint->isPubliclyVisible();
    }

    /**
     * May comment / vote Satisfied or Not satisfied?
     * Only on posts the person can see, only once approved (nobody interacts with something still in the
     * moderation queue), and residents can't touch a post the barangay removed.
     */
    public function interact(User $user, Complaint $complaint): bool
    {
        return $this->view($user, $complaint)
            && $complaint->isApproved()
            && ($user->isAdmin() || ! $complaint->isRemoved());
    }

    /** May edit the text/photo? The author or an admin; residents can't edit a post the barangay removed. */
    public function update(User $user, Complaint $complaint): bool
    {
        return ($user->isAdmin() || $complaint->user_id === $user->id)
            && ($user->isAdmin() || ! $complaint->isRemoved());
    }

    /** May permanently delete? ONLY the author. Admins use "remove with reason" so there is a paper trail. */
    public function delete(User $user, Complaint $complaint): bool
    {
        return $complaint->user_id === $user->id;
    }

    /** Approve, decline/remove, restore, change status: barangay officials only. */
    public function moderate(User $user, Complaint $complaint): bool
    {
        return $user->isAdmin();
    }
}

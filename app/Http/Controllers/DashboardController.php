<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    /**
     * Display the dashboard.
     */
    public function index(): View
    {
        $stats = [
            [
                'title' => 'Total Users',
                'value' => '1,024',
                'change' => '+12.5%',
                'trend' => 'up',
            ],
            [
                'title' => 'Revenue',
                'value' => '$48,200',
                'change' => '+8.2%',
                'trend' => 'up',
            ],
            [
                'title' => 'Orders',
                'value' => '356',
                'change' => '-3.1%',
                'trend' => 'down',
            ],
            [
                'title' => 'Conversion Rate',
                'value' => '3.24%',
                'change' => '+1.8%',
                'trend' => 'up',
            ],
        ];

        $recentActivities = [
            ['user' => 'Alice Johnson', 'action' => 'placed an order', 'time' => '2 minutes ago'],
            ['user' => 'Bob Smith', 'action' => 'signed up', 'time' => '15 minutes ago'],
            ['user' => 'Carol Davis', 'action' => 'left a review', 'time' => '1 hour ago'],
            ['user' => 'Dan Wilson', 'action' => 'updated profile', 'time' => '3 hours ago'],
            ['user' => 'Eve Martinez', 'action' => 'made a payment', 'time' => '5 hours ago'],
        ];

        return view('dashboard', compact('stats', 'recentActivities'));
    }
}

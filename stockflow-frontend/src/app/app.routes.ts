import { Routes } from '@angular/router';
import { Login } from './features/auth/pages/login/login';
import { RegisterCompany } from './features/auth/pages/register-company/register-company';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { MainLayout } from './shared/layout/main-layout/main-layout';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    {
        path: 'login',
        component: Login
    },
    {
        path: 'register-company',
        component: RegisterCompany
    },
    {
        path: '',
        component: MainLayout,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: Dashboard },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
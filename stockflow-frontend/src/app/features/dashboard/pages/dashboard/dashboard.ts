import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  DashboardResponse,
  DashboardService
} from '../../../../core/services/dashboard';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, StatCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private dashboardService = inject(DashboardService);

  data = signal<DashboardResponse | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
        this.data.set(response);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.message || 'No se pudo cargar el dashboard'
        );
        this.isLoading.set(false);
      }
    });
  }

  getMovementLabel(type: 'in' | 'out'): string {
    return type === 'in' ? 'Entrada' : 'Salida';
  }
}
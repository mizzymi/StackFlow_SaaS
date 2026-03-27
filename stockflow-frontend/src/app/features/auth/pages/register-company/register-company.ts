import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-company.html',
  styleUrl: './register-company.scss'
})
export class RegisterCompany {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  registerForm = this.fb.group({
    company_name: ['', [Validators.required]],
    tax_id: [''],
    company_email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    admin_name: ['', [Validators.required]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.registerForm.getRawValue();

    this.authService.registerCompany({
      company_name: formValue.company_name ?? '',
      tax_id: formValue.tax_id ?? '',
      company_email: formValue.company_email ?? '',
      phone: formValue.phone ?? '',
      address: formValue.address ?? '',
      admin_name: formValue.admin_name ?? '',
      admin_email: formValue.admin_email ?? '',
      admin_password: formValue.admin_password ?? ''
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(response.message);
        this.registerForm.reset();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          error?.error?.message || 'No se pudo iniciar sesión'
        );
      }
    });
  }
}
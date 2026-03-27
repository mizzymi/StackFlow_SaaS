import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'company_admin' | 'employee';
    company_id: number | null;
  };
}

interface RegisterCompanyPayload {
  company_name: string;
  tax_id?: string;
  company_email?: string;
  phone?: string;
  address?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

interface RegisterCompanyResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenKey = 'token';
  private userKey = 'user';

  registerCompany(data: RegisterCompanyPayload): Observable<RegisterCompanyResponse> {
    return this.http.post<RegisterCompanyResponse>(`${this.apiUrl}/register-company`, data);
  }

  login(data: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.setUser(response.user);
      })
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setUser(user: unknown): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): any | null {
    const rawUser = localStorage.getItem(this.userKey);
    return rawUser ? JSON.parse(rawUser) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}
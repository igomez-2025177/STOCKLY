import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

type Campo = 'nombre' | 'correo' | 'password';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly modoRegistro = signal(false);
  readonly revisando = signal(true);
  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: [''],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.aviso.set(this.auth.mensajeLogin());
    this.auth.mensajeLogin.set(null);

    this.auth.registroAbierto().subscribe({
      next: ({ abierto }) => {
        this.modoRegistro.set(abierto);

        if (abierto) {
          this.form.controls.nombre.setValidators([Validators.required]);
          this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
          this.form.controls.nombre.updateValueAndValidity();
          this.form.controls.password.updateValueAndValidity();
        }

        this.revisando.set(false);
      },
      error: () => {
        this.revisando.set(false);
        this.error.set('No se pudo conectar con el servidor. Revisa que el backend esté corriendo');
      },
    });
  }

  campoInvalido(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.aviso.set(null);
    this.cargando.set(true);

    const { nombre, correo, password } = this.form.getRawValue();

    const peticion = this.modoRegistro()
      ? this.auth.register(nombre.trim(), correo.trim(), password)
      : this.auth.login(correo.trim(), password);

    peticion.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);

        if (err.status === 0) {
          this.error.set('No se pudo conectar con el servidor. Revisa que el backend esté corriendo');
        } else {
          this.error.set(err.error?.error ?? 'Ocurrió un error, intenta de nuevo');
        }
      },
    });
  }
}
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GOOGLE_CLIENT_ID } from '../../core/config';
import { mensajeError } from '../../core/utils/errores';

type Campo = 'nombre' | 'correo' | 'password';
type Modo = 'login' | 'registro';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);

  private readonly botonGoogle = viewChild<ElementRef<HTMLDivElement>>('botonGoogle');

  readonly modo = signal<Modo>('login');
  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly googleNoDisponible = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: [''],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private timerGoogle?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.aviso.set(this.auth.mensajeLogin());
    this.auth.mensajeLogin.set(null);
  }

  ngAfterViewInit(): void {
    this.iniciarGoogle();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerGoogle);
  }

  private iniciarGoogle(intentos = 0): void {
    const google = (window as any).google;

    if (!google?.accounts?.id) {
      if (intentos < 50) {
        this.timerGoogle = setTimeout(() => this.iniciarGoogle(intentos + 1), 100);
      } else {
        this.googleNoDisponible.set(true);
      }
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (respuesta: { credential: string }) => {
        this.zone.run(() => this.alResponderGoogle(respuesta.credential));
      },
    });

    const contenedor = this.botonGoogle()?.nativeElement;

    if (contenedor) {
      google.accounts.id.renderButton(contenedor, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        locale: 'es',
        width: Math.min(contenedor.offsetWidth || 400, 400),
      });
    }
  }

  private alResponderGoogle(credential: string): void {
    this.error.set(null);
    this.aviso.set(null);
    this.cargando.set(true);

    this.auth.loginGoogle(credential).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err, 'No se pudo entrar con Google, intenta de nuevo'));
      },
    });
  }

  cambiarModo(modo: Modo): void {
    this.modo.set(modo);
    this.error.set(null);
    this.aviso.set(null);

    const { nombre, password } = this.form.controls;

    if (modo === 'registro') {
      nombre.setValidators([Validators.required]);
      password.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      nombre.clearValidators();
      password.setValidators([Validators.required]);
    }

    nombre.updateValueAndValidity();
    password.updateValueAndValidity();
    this.form.markAsUntouched();
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

    const peticion =
      this.modo() === 'registro'
        ? this.auth.register(nombre.trim(), correo.trim(), password)
        : this.auth.login(correo.trim(), password);

    peticion.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err));
      },
    });
  }
}
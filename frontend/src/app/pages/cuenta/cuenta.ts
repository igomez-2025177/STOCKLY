import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PerfilUsuario } from '../../core/models/usuario.model';
import { mensajeError } from '../../core/utils/errores';

function contrasenasIguales(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('passwordNuevo')?.value;
  const confirmar = grupo.get('confirmar')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cuenta',
  imports: [ReactiveFormsModule],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.css',
})
export class Cuenta implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly perfil = signal<PerfilUsuario | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly guardandoNombre = signal(false);
  readonly mensajeNombre = signal<string | null>(null);
  readonly errorNombre = signal<string | null>(null);

  readonly guardandoPassword = signal(false);
  readonly mensajePassword = signal<string | null>(null);
  readonly errorPassword = signal<string | null>(null);
  readonly verPassword = signal(false);

  readonly formNombre = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
  });

  readonly formPassword = this.fb.nonNullable.group(
    {
      passwordActual: [''],
      passwordNuevo: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: contrasenasIguales }
  );

  private timerNombre?: ReturnType<typeof setTimeout>;
  private timerPassword?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.auth.obtenerPerfil().subscribe({
      next: ({ user }) => {
        this.perfil.set(user);
        this.formNombre.reset({ nombre: user.nombre });
        const actual = this.formPassword.controls.passwordActual;
        actual.setValidators(user.tienePassword ? [Validators.required] : []);
        actual.updateValueAndValidity();

        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudieron cargar tus datos'));
        this.cargando.set(false);
      },
    });
  }

  nombreInvalido(): boolean {
    const control = this.formNombre.controls.nombre;
    return control.invalid && control.touched;
  }

  campoPasswordInvalido(campo: 'passwordActual' | 'passwordNuevo' | 'confirmar'): boolean {
    const control = this.formPassword.controls[campo];
    return control.invalid && control.touched;
  }

  noCoinciden(): boolean {
    return !!this.formPassword.errors?.['noCoinciden'] && this.formPassword.controls.confirmar.touched;
  }

  guardarNombre(): void {
    if (this.formNombre.invalid) {
      this.formNombre.markAllAsTouched();
      return;
    }

    const nombre = this.formNombre.getRawValue().nombre.trim();

    if (nombre === this.perfil()?.nombre) {
      this.mostrar(this.mensajeNombre, 'No hay cambios que guardar', 'nombre');
      return;
    }

    this.guardandoNombre.set(true);
    this.errorNombre.set(null);

    this.auth.actualizarNombre(nombre).subscribe({
      next: ({ message, user }) => {
        this.guardandoNombre.set(false);
        this.perfil.update((p) => (p ? { ...p, nombre: user.nombre } : p));
        this.mostrar(this.mensajeNombre, message, 'nombre');
      },
      error: (err) => {
        this.guardandoNombre.set(false);
        this.errorNombre.set(mensajeError(err));
      },
    });
  }

  guardarPassword(): void {
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }

    const perfil = this.perfil();
    const { passwordActual, passwordNuevo } = this.formPassword.getRawValue();

    this.guardandoPassword.set(true);
    this.errorPassword.set(null);

    this.auth.cambiarPassword(perfil?.tienePassword ? passwordActual : null, passwordNuevo).subscribe({
      next: ({ message }) => {
        this.guardandoPassword.set(false);
        this.formPassword.reset();
        this.verPassword.set(false);
        this.mostrar(this.mensajePassword, message, 'password');
        this.cargar();
      },
      error: (err) => {
        this.guardandoPassword.set(false);
        this.errorPassword.set(mensajeError(err));
      },
    });
  }

  private mostrar(senal: ReturnType<typeof signal<string | null>>, texto: string, cual: 'nombre' | 'password'): void {
    senal.set(texto);

    if (cual === 'nombre') {
      clearTimeout(this.timerNombre);
      this.timerNombre = setTimeout(() => senal.set(null), 3500);
    } else {
      clearTimeout(this.timerPassword);
      this.timerPassword = setTimeout(() => senal.set(null), 4500);
    }
  }
}
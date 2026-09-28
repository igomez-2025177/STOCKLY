import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Proveedor } from '../../core/models/proveedor.model';
import { mensajeError } from '../../core/utils/errores';
import { Modal } from '../../shared/modal/modal';

type Campo = 'nombre' | 'contacto' | 'telefono' | 'correo' | 'nit';

const REGEX_TELEFONO = /^[0-9+\-\s]{8,15}$/;
const REGEX_NIT = /^([0-9]+-?[0-9kK]|[cC][fF])$/;

@Component({
  selector: 'app-proveedores',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {
  private service = inject(ProveedorService);
  private fb = inject(FormBuilder);


  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly verTodos = signal(false);

  readonly modalAbierto = signal(false);
  readonly editando = signal<Proveedor | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly reactivarId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    contacto: ['', [Validators.maxLength(80)]],
    telefono: ['', [Validators.pattern(REGEX_TELEFONO)]],
    correo: ['', [Validators.email]],
    nit: ['', [Validators.pattern(REGEX_NIT)]],
  });

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.proveedores();

    return this.proveedores().filter((p) =>
      [p.nombre, p.contacto, p.telefono, p.nit].some((valor) => (valor ?? '').toLowerCase().includes(texto))
    );
  });

  private timerMensaje?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service.listar(this.verTodos()).subscribe({
      next: ({ proveedores }) => {
        this.proveedores.set(proveedores);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudieron cargar los proveedores'));
        this.cargando.set(false);
      },
    });
  }

  cambiarVerTodos(valor: boolean): void {
    this.verTodos.set(valor);
    this.cargar();
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', contacto: '', telefono: '', correo: '', nit: '' });
    this.errorForm.set(null);
    this.reactivarId.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(proveedor: Proveedor): void {
    this.editando.set(proveedor);
    this.form.reset({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto ?? '',
      telefono: proveedor.telefono ?? '',
      correo: proveedor.correo ?? '',
      nit: proveedor.nit ?? '',
    });
    this.errorForm.set(null);
    this.reactivarId.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  campoInvalido(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    this.reactivarId.set(null);

    const datos = this.form.getRawValue();
    const actual = this.editando();

    const peticion = actual ? this.service.actualizar(actual.id, datos) : this.service.crear(datos);

    peticion.subscribe({
      next: ({ message }) => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeError(err));

        const id = err?.error?.proveedorId;
        if (typeof id === 'number') {
          this.reactivarId.set(id);
        }
      },
    });
  }

  reactivarDesdeAviso(): void {
    const id = this.reactivarId();
    if (!id) return;

    this.guardando.set(true);

    this.service.cambiarEstado(id, true).subscribe({
      next: ({ message }) => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeError(err));
      },
    });
  }

  cambiarEstado(proveedor: Proveedor): void {
    const activar = !proveedor.activo;

    if (!activar && !confirm(`¿Desactivar al proveedor "${proveedor.nombre}"? Ya no aparecerá al registrar compras.`)) {
      return;
    }

    this.service.cambiarEstado(proveedor.id, activar).subscribe({
      next: ({ message }) => {
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  eliminar(proveedor: Proveedor): void {
    if (!confirm(`¿Eliminar al proveedor "${proveedor.nombre}"? Esto no se puede deshacer.`)) {
      return;
    }

    this.service.eliminar(proveedor.id).subscribe({
      next: ({ message }) => {
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  private mostrarMensaje(texto: string): void {
    this.error.set(null);
    this.mensaje.set(texto);
    clearTimeout(this.timerMensaje);
    this.timerMensaje = setTimeout(() => this.mensaje.set(null), 3000);
  }
}
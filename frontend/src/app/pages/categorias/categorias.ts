import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriaService } from '../../core/services/categoria.service';
import { Categoria } from '../../core/models/categoria.model';
import { mensajeError } from '../../core/utils/errores';
import { Modal } from '../../shared/modal/modal';

@Component({
  selector: 'app-categorias',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
  private service = inject(CategoriaService);
  private fb = inject(FormBuilder);

  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly verTodas = signal(false);

  readonly modalAbierto = signal(false);
  readonly editando = signal<Categoria | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly reactivarId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    descripcion: ['', [Validators.maxLength(200)]],
  });

  // filtra mientras escribes, sin ir al backend
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.categorias();

    return this.categorias().filter(
      (c) =>
        c.nombre.toLowerCase().includes(texto) ||
        (c.descripcion ?? '').toLowerCase().includes(texto)
    );
  });

  private timerMensaje?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service.listar(this.verTodas()).subscribe({
      next: ({ categorias }) => {
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudieron cargar las categorías'));
        this.cargando.set(false);
      },
    });
  }

  cambiarVerTodas(valor: boolean): void {
    this.verTodas.set(valor);
    this.cargar();
  }

  abrirNueva(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', descripcion: '' });
    this.errorForm.set(null);
    this.reactivarId.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(categoria: Categoria): void {
    this.editando.set(categoria);
    this.form.reset({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' });
    this.errorForm.set(null);
    this.reactivarId.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  campoInvalido(campo: 'nombre' | 'descripcion'): boolean {
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
        const id = err?.error?.categoriaId;
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

  cambiarEstado(categoria: Categoria): void {
    const activar = !categoria.activo;

    if (!activar && !confirm(`¿Desactivar la categoría "${categoria.nombre}"? Ya no aparecerá al crear productos.`)) {
      return;
    }

    this.service.cambiarEstado(categoria.id, activar).subscribe({
      next: ({ message }) => {
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  eliminar(categoria: Categoria): void {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"? Esto no se puede deshacer.`)) {
      return;
    }

    this.service.eliminar(categoria.id).subscribe({
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
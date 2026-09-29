import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductoService } from '../../core/services/producto.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Producto, ProductoPayload } from '../../core/models/producto.model';
import { Categoria } from '../../core/models/categoria.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { TipoMovimiento, textoUnidades } from '../../core/models/movimiento.model';
import { mensajeError } from '../../core/utils/errores';
import { Modal } from '../../shared/modal/modal';

type Campo =
  | 'nombre'
  | 'descripcion'
  | 'ubicacion'
  | 'precioCompra'
  | 'precioVenta'
  | 'stockMinimo'
  | 'categoriaId'
  | 'stockInicial';

const SOLO_ENTEROS = /^\d+$/;

@Component({
  selector: 'app-productos',
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink, Modal],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
})
export class Productos implements OnInit {
  private service = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private proveedorService = inject(ProveedorService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly textoUnidades = textoUnidades;

  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly advertencia = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly filtroCategoria = signal<number | null>(null);
  readonly filtroProveedor = signal<number | null>(null);
  readonly soloStockBajo = signal(false);
  readonly verTodos = signal(false);

  readonly modalAbierto = signal(false);
  readonly editando = signal<Producto | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly reactivarId = signal<number | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.maxLength(300)]],
    ubicacion: ['', [Validators.maxLength(60)]],
    precioCompra: [0 as number | null, [Validators.min(0)]],
    precioVenta: [null as number | null, [Validators.required, Validators.min(0)]],
    stockMinimo: [0 as number | null, [Validators.required, Validators.min(0), Validators.pattern(SOLO_ENTEROS)]],
    categoriaId: ['', [Validators.required]],
    proveedorId: [''],
    stockInicial: [0 as number | null, [Validators.min(0), Validators.pattern(SOLO_ENTEROS)]],
  });

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly margen = computed(() => {
    const v = this.valores();
    const compra = Number(v.precioCompra) || 0;
    const venta = Number(v.precioVenta);

    if (!venta && venta !== 0) return null;

    const ganancia = venta - compra;
    const porcentaje = compra > 0 ? (ganancia / compra) * 100 : null;

    return { ganancia, porcentaje, pierde: compra > 0 && ganancia < 0 };
  });

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.productos();

    return this.productos().filter((p) => p.nombre.toLowerCase().includes(texto));
  });

  readonly hayFiltros = computed(
    () => !!this.filtroCategoria() || !!this.filtroProveedor() || this.soloStockBajo() || !!this.busqueda().trim()
  );

  private timerMensaje?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargar();
  }

  cargarCatalogos(): void {
    forkJoin({
      categorias: this.categoriaService.listar(),
      proveedores: this.proveedorService.listar(),
    }).subscribe({
      next: ({ categorias, proveedores }) => {
        this.categorias.set(categorias.categorias);
        this.proveedores.set(proveedores.proveedores);
      },
      error: (err) => this.error.set(mensajeError(err, 'No se pudieron cargar las categorías y proveedores')),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service
      .listar({
        categoriaId: this.filtroCategoria(),
        proveedorId: this.filtroProveedor(),
        stockBajo: this.soloStockBajo(),
        todos: this.verTodos(),
      })
      .subscribe({
        next: ({ productos }) => {
          this.productos.set(productos);
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'No se pudieron cargar los productos'));
          this.cargando.set(false);
        },
      });
  }

  cambiarFiltroCategoria(valor: string): void {
    this.filtroCategoria.set(valor ? Number(valor) : null);
    this.cargar();
  }

  cambiarFiltroProveedor(valor: string): void {
    this.filtroProveedor.set(valor ? Number(valor) : null);
    this.cargar();
  }

  cambiarSoloStockBajo(valor: boolean): void {
    this.soloStockBajo.set(valor);
    this.cargar();
  }

  cambiarVerTodos(valor: boolean): void {
    this.verTodos.set(valor);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroCategoria.set(null);
    this.filtroProveedor.set(null);
    this.soloStockBajo.set(false);
    this.cargar();
  }

  registrarMovimiento(producto: Producto): void {
    const tipo: TipoMovimiento = producto.stockActual === 0 ? 'ENTRADA' : 'SALIDA';

    this.router.navigate(['/movimientos'], {
      queryParams: { producto: producto.id, tipo },
    });
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({
      nombre: '',
      descripcion: '',
      ubicacion: '',
      precioCompra: 0,
      precioVenta: null,
      stockMinimo: 0,
      categoriaId: this.filtroCategoria() ? String(this.filtroCategoria()) : '',
      proveedorId: this.filtroProveedor() ? String(this.filtroProveedor()) : '',
      stockInicial: 0,
    });
    this.errorForm.set(null);
    this.reactivarId.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(producto: Producto): void {
    this.editando.set(producto);
    this.form.reset({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      ubicacion: producto.ubicacion ?? '',
      precioCompra: Number(producto.precioCompra),
      precioVenta: Number(producto.precioVenta),
      stockMinimo: producto.stockMinimo,
      categoriaId: String(producto.categoriaId),
      proveedorId: producto.proveedorId ? String(producto.proveedorId) : '',
      stockInicial: 0,
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

    const v = this.form.getRawValue();
    const actual = this.editando();

    const datos: ProductoPayload = {
      nombre: (v.nombre ?? '').trim(),
      descripcion: v.descripcion ?? '',
      ubicacion: v.ubicacion ?? '',
      precioCompra: Number(v.precioCompra) || 0,
      precioVenta: Number(v.precioVenta),
      stockMinimo: Number(v.stockMinimo) || 0,
      categoriaId: Number(v.categoriaId),
      proveedorId: v.proveedorId ? Number(v.proveedorId) : null,
    };

    if (!actual) {
      datos.stockInicial = Number(v.stockInicial) || 0;
    }

    const peticion = actual ? this.service.actualizar(actual.id, datos) : this.service.crear(datos);

    peticion.subscribe({
      next: ({ message, advertencia }) => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.mostrarMensaje(message, advertencia);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeError(err));

        const id = err?.error?.productoId;
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

  cambiarEstado(producto: Producto): void {
    const activar = !producto.activo;

    if (!activar && !confirm(`¿Desactivar "${producto.nombre}"? Ya no se podrán registrar entradas ni salidas.`)) {
      return;
    }

    this.service.cambiarEstado(producto.id, activar).subscribe({
      next: ({ message }) => {
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  eliminar(producto: Producto): void {
    if (!confirm(`¿Eliminar "${producto.nombre}"? Solo se puede si nunca tuvo movimientos.`)) {
      return;
    }

    this.service.eliminar(producto.id).subscribe({
      next: ({ message }) => {
        this.mostrarMensaje(message);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  private mostrarMensaje(texto: string, advertencia?: string): void {
    this.error.set(null);
    this.mensaje.set(texto);
    this.advertencia.set(advertencia ?? null);
    clearTimeout(this.timerMensaje);
    this.timerMensaje = setTimeout(() => {
      this.mensaje.set(null);
      this.advertencia.set(null);
    }, advertencia ? 7000 : 3000);
  }
}
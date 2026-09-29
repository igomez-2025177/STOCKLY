import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { MovimientoService } from '../../core/services/movimiento.service';
import { ProductoService } from '../../core/services/producto.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import {
  MOTIVO_TEXTO,
  MOTIVOS_CON_NOTA,
  MOTIVOS_POR_TIPO,
  MotivoMovimiento,
  Movimiento,
  MovimientoPayload,
  TipoMovimiento,
  ayudaMotivo,
  textoUnidades,
} from '../../core/models/movimiento.model';
import { Producto } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { mensajeError } from '../../core/utils/errores';
import { Modal } from '../../shared/modal/modal';

type Campo = 'productoId' | 'cantidad' | 'precioUnitario' | 'nota';

const POR_PAGINA = 15;

function notaSegunMotivo(grupo: AbstractControl): ValidationErrors | null {
  const motivo = grupo.get('motivo')?.value as MotivoMovimiento;
  const nota = String(grupo.get('nota')?.value ?? '').trim();
  return MOTIVOS_CON_NOTA.includes(motivo) && !nota ? { notaRequerida: true } : null;
}

@Component({
  selector: 'app-movimientos',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, LowerCasePipe, Modal],
  templateUrl: './movimientos.html',
  styleUrl: './movimientos.css',
})
export class Movimientos implements OnInit {
  private service = inject(MovimientoService);
  private productoService = inject(ProductoService);
  private proveedorService = inject(ProveedorService);
  private fb = inject(FormBuilder);

  readonly motivoTexto = MOTIVO_TEXTO;
  readonly todosLosMotivos = Object.keys(MOTIVO_TEXTO) as MotivoMovimiento[];
  readonly unidades = textoUnidades;

  readonly movimientos = signal<Movimiento[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly totalPaginas = signal(1);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly alerta = signal<string | null>(null);

  readonly productos = signal<Producto[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);

  readonly fProducto = signal<number | null>(null);
  readonly fTipo = signal<TipoMovimiento | ''>('');
  readonly fMotivo = signal<MotivoMovimiento | ''>('');
  readonly fDesde = signal('');
  readonly fHasta = signal('');

  readonly hayFiltros = computed(
    () => !!this.fProducto() || !!this.fTipo() || !!this.fMotivo() || !!this.fDesde() || !!this.fHasta()
  );

  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      tipo: ['SALIDA' as TipoMovimiento, [Validators.required]],
      motivo: ['VENTA' as MotivoMovimiento, [Validators.required]],
      productoId: ['', [Validators.required]],
      cantidad: [null as number | null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      proveedorId: [''],
      precioUnitario: [null as number | null, [Validators.min(0)]],
      nota: ['', [Validators.maxLength(300)]],
    },
    { validators: notaSegunMotivo }
  );

  private readonly valores = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  readonly tipoActual = computed(() => (this.valores().tipo ?? 'SALIDA') as TipoMovimiento);
  readonly motivoActual = computed(() => (this.valores().motivo ?? 'VENTA') as MotivoMovimiento);
  readonly motivosDisponibles = computed(() => MOTIVOS_POR_TIPO[this.tipoActual()]);
  readonly ayuda = computed(() => ayudaMotivo(this.tipoActual(), this.motivoActual()));
  readonly pideNota = computed(() => MOTIVOS_CON_NOTA.includes(this.motivoActual()));

  readonly aceptaProveedor = computed(
    () => this.motivoActual() === 'COMPRA' || (this.tipoActual() === 'SALIDA' && this.motivoActual() === 'DEVOLUCION')
  );

  readonly aceptaPrecio = computed(() => this.motivoActual() === 'COMPRA' || this.motivoActual() === 'VENTA');

  readonly productoSeleccionado = computed(
    () => this.productos().find((p) => p.id === Number(this.valores().productoId)) ?? null
  );

  readonly vistaPrevia = computed(() => {
    const producto = this.productoSeleccionado();
    const cantidad = Number(this.valores().cantidad);

    if (!producto || !Number.isInteger(cantidad) || cantidad <= 0) return null;

    const despues = this.tipoActual() === 'ENTRADA' ? producto.stockActual + cantidad : producto.stockActual - cantidad;

    return {
      antes: producto.stockActual,
      despues,
      alcanza: despues >= 0,
      bajoMinimo: despues >= 0 && despues <= producto.stockMinimo,
      minimo: producto.stockMinimo,
    };
  });

  readonly totalMovimiento = computed(() => {
    const cantidad = Number(this.valores().cantidad) || 0;
    const precio = Number(this.valores().precioUnitario) || 0;
    return cantidad * precio;
  });

  private timerMensaje?: ReturnType<typeof setTimeout>;

  constructor() {
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      const permitidos = MOTIVOS_POR_TIPO[(tipo ?? 'SALIDA') as TipoMovimiento];
      if (!permitidos.includes(this.form.controls.motivo.value as MotivoMovimiento)) {
        this.form.controls.motivo.setValue(permitidos[0]);
      }
      this.sugerirDatos();
    });

    // al cambiar producto o motivo se llena solo el precio y el proveedor
    this.form.controls.motivo.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.sugerirDatos());
    this.form.controls.productoId.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.sugerirDatos());
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargar();
  }

  cargarCatalogos(): void {
    this.productoService.listar().subscribe({
      next: ({ productos }) => this.productos.set(productos),
      error: (err) => this.error.set(mensajeError(err, 'No se pudieron cargar los productos')),
    });

    this.proveedorService.listar().subscribe({
      next: ({ proveedores }) => this.proveedores.set(proveedores),
      error: () => {},
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service
      .listar({
        productoId: this.fProducto(),
        tipo: this.fTipo(),
        motivo: this.fMotivo(),
        desde: this.fDesde(),
        hasta: this.fHasta(),
        pagina: this.pagina(),
        limite: POR_PAGINA,
      })
      .subscribe({
        next: (res) => {
          this.movimientos.set(res.movimientos);
          this.total.set(res.total);
          this.totalPaginas.set(Math.max(1, res.totalPaginas));
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'No se pudieron cargar los movimientos'));
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.fProducto.set(null);
    this.fTipo.set('');
    this.fMotivo.set('');
    this.fDesde.set('');
    this.fHasta.set('');
    this.aplicarFiltros();
  }

  irAPagina(numero: number): void {
    if (numero < 1 || numero > this.totalPaginas()) return;
    this.pagina.set(numero);
    this.cargar();
  }

  abrirNuevo(tipo: TipoMovimiento): void {
    this.form.reset({
      tipo,
      motivo: tipo === 'ENTRADA' ? 'COMPRA' : 'VENTA',
      productoId: '',
      cantidad: null,
      proveedorId: '',
      precioUnitario: null,
      nota: '',
    });
    this.errorForm.set(null);
    this.cargarCatalogos();
    this.modalAbierto.set(true);
  }

  elegirTipo(tipo: TipoMovimiento): void {
    this.form.controls.tipo.setValue(tipo);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  campoInvalido(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  notaInvalida(): boolean {
    return !!this.form.errors?.['notaRequerida'] && this.form.controls.nota.touched;
  }

  private sugerirDatos(): void {
    const producto = this.productos().find((p) => p.id === Number(this.form.controls.productoId.value));
    const motivo = this.form.controls.motivo.value as MotivoMovimiento;

    if (!producto) return;

    if (motivo === 'VENTA') {
      this.form.controls.precioUnitario.setValue(Number(producto.precioVenta));
    } else if (motivo === 'COMPRA') {
      this.form.controls.precioUnitario.setValue(Number(producto.precioCompra));
    } else {
      this.form.controls.precioUnitario.setValue(null);
    }

    if (motivo === 'COMPRA' && producto.proveedorId && !this.form.controls.proveedorId.value) {
      this.form.controls.proveedorId.setValue(String(producto.proveedorId));
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const vista = this.vistaPrevia();

    if (vista && !vista.alcanza) {
      this.errorForm.set(`No alcanza: solo hay ${vista.antes} ${textoUnidades(vista.antes)}`);
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);

    const v = this.form.getRawValue();

    const datos: MovimientoPayload = {
      tipo: v.tipo as TipoMovimiento,
      motivo: v.motivo as MotivoMovimiento,
      cantidad: Number(v.cantidad),
      productoId: Number(v.productoId),
      proveedorId: this.aceptaProveedor() && v.proveedorId ? Number(v.proveedorId) : null,
      precioUnitario:
        this.aceptaPrecio() && v.precioUnitario !== null && String(v.precioUnitario) !== ''
          ? Number(v.precioUnitario)
          : null,
      nota: (v.nota ?? '').trim(),
    };

    this.service.registrar(datos).subscribe({
      next: ({ message, alerta }) => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.mostrarMensaje(message, alerta);
        this.pagina.set(1);
        this.cargar();
        this.cargarCatalogos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeError(err));
      },
    });
  }

  private mostrarMensaje(texto: string, alerta?: string): void {
    this.error.set(null);
    this.mensaje.set(texto);
    this.alerta.set(alerta ?? null);
    clearTimeout(this.timerMensaje);
    this.timerMensaje = setTimeout(() => {
      this.mensaje.set(null);
      this.alerta.set(null);
    }, alerta ? 8000 : 3000);
  }
}
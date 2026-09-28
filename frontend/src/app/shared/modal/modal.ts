import { Component, HostListener, input, output } from '@angular/core';

// ventana emergente reutilizable, lo de adentro se pasa con <ng-content>
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly abierto = input(false);
  // 'normal' pa formularios cortos, 'grande' pa los largos como productos
  readonly tamano = input<'normal' | 'grande'>('normal');
  readonly cerrar = output<void>();

  // se cierra con Esc
  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }
}
import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly abierto = input(false);
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }
}
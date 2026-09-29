import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly abierto = input(false);

  readonly tamano = input<'normal' | 'grande'>('normal');
  readonly cerrar = output<void>();

  readonly rebotando = signal(false);

  private timerRebote?: ReturnType<typeof setTimeout>;

  alClicAfuera(): void {
    this.rebotando.set(false);
    clearTimeout(this.timerRebote);

    requestAnimationFrame(() => {
      this.rebotando.set(true);
      this.timerRebote = setTimeout(() => this.rebotando.set(false), 300);
    });
  }
}
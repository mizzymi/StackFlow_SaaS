import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss'
})
export class StatCard {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value: number | string = 0;
  @Input() hint = '';
}
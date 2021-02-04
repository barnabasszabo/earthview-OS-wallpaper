import { SlugChainData } from './../earthview.model';
import { EarthviewService } from './../earthview.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CountdownComponent } from 'ngx-countdown';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  constructor(private earthviewService: EarthviewService) { }

  nextSlug: SlugChainData;

  freqRanges = [
    { label: `1 minute`, sleep: 1000 * 60},
    { label: `5 minutes`, sleep: 1000 * 60 * 5},
    { label: `30 minutes`, sleep: 1000 * 60 * 30},
    { label: `1 hour`, sleep: 1000 * 60 * 60 * 1},
    { label: `6 hours`, sleep: 1000 * 60 * 60 * 6},
    { label: `8 hours`, sleep: 1000 * 60 * 60 * 8},
    { label: `12 hours`, sleep: 1000 * 60 * 60 * 12},
    { label: `24 hours`, sleep: 1000 * 60 * 60 * 24},
  ];
  freqRange = 0;

  @ViewChild('cd', { static: false })
  private countdown: CountdownComponent;
  sleepTime = 1000;

  timer: NodeJS.Timeout;

  ngOnInit(): void {
    setLongTimeout(() => {
      (async() => {
        await this.initNextWallpaper();
      })()
    }, 1000 * 2);

    try { this.freqRange = Number(localStorage.getItem('freqRange')) || 0; } catch (e) {}

    this.startTimer();
  }

  startTimer() {
    this.sleepTime = this.freqRanges[this.freqRange].sleep;
    console.log(`startTimer new sleep time`, this.sleepTime);

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setLongTimeout(() => {
      this.changeBackground(this.nextSlug);
    }, this.sleepTime);

    if (this.countdown) { this.countdown.restart(); }
  }

  async initNextWallpaper() {
    this.nextSlug = await this.earthviewService.getRandomCachedData();
  }

  async changeBackground(slug: SlugChainData) {
    this.earthviewService.setWallpaper(slug);
    this.initNextWallpaper();
    this.startTimer();
  }

  onSubmit(form) {
    localStorage.setItem('freqRange', this.freqRange + '');
    this.startTimer();
  }

  moreThan24HoursFormatDate({ date, formatStr }) {
    const CountdownTimeUnits: Array<[string, number]> = [
      ['Y', 1000 * 60 * 60 * 24 * 365], // years
      ['M', 1000 * 60 * 60 * 24 * 30], // months
      ['D', 1000 * 60 * 60 * 24], // days
      ['H', 1000 * 60 * 60], // hours
      ['m', 1000 * 60], // minutes
      ['s', 1000], // seconds
      ['S', 1], // million seconds
    ];
    let duration = Number(date || 0);

    return CountdownTimeUnits.reduce((current, [name, unit]) => {
      if (current.indexOf(name) !== -1) {
        const v = Math.floor(duration / unit);
        duration -= v * unit;
        return current.replace(new RegExp(`${name}+`, 'g'), (match: string) => {
          return v.toString().padStart(match.length, '0');
        });
      }
      return current;
    }, formatStr);
  }

}

function setLongTimeout(callback, timeout_ms) {
  if(timeout_ms > 2147483647) {
    return setTimeout(function(){ setLongTimeout(callback, (timeout_ms - 2147483647)); }, 2147483647);
  } else {
    return setTimeout(callback, timeout_ms);
  }
}

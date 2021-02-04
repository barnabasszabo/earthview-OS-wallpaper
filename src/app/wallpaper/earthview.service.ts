import { ElectronService } from './../core/services/electron/electron.service';
import { EarthviewOptions, SlugChainData } from './earthview.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Jimp from 'jimp';

@Injectable({
  providedIn: 'root'
})
export class EarthviewService {

  cacheData: SlugChainData[] = [];
  initSlug = `svalbard-svalbard-and-jan-mayen-14259`;
  imageHomeDir: string;
  jimp: typeof Jimp;

  constructor(private http: HttpClient, private electronService: ElectronService) {
    this.sync();

    this.imageHomeDir = this.electronService.path.join(this.electronService.os.homedir(), "/.earthview");
    if (!this.electronService.fs.existsSync(this.imageHomeDir)){
      this.electronService.fs.mkdirSync(this.imageHomeDir);
    }

    this.jimp = window.require('jimp');
  }

  private sync(waitMs = 1000) {
    setTimeout(() => {
      console.log(`Start sync ...`);
      (async () => {
        this.cacheData = await this.parseSlugChain(this.initSlug, this.cacheData);
      })();
      this.sync( (1000 * 60 * 60 * 24) );
    }, waitMs);
  }

  async setWallpaper(data: SlugChainData, options?: EarthviewOptions) {
    let picturePath = this.electronService.path.join(this.imageHomeDir, `${data.slug}.jpg`);

    await this.downloadFile(data.photoUrl, picturePath, data.name);
    console.log(`File downloaded ${data.slug}.jpg`, );

    await this.electronService.wallpaper.set(picturePath, options);
    console.log(`wallpaper set success`);

  }

  async getRandomCachedData() {
    if (this.cacheData?.length === 0) {
      const json: any = await this.get(`https://earthview.withgoogle.com/_api/${this.initSlug}.json`);
      this.cacheData = [{slug: json.slug, photoUrl: json.photoUrl, name: json.name}];
    }
    return this.cacheData[ Math.floor(Math.random() * this.cacheData.length) ];
  }

  private async parseSlugChain(slug, jsonList: SlugChainData[] = []) {
    if (jsonList.filter(e => e.slug === slug).length === 0) {
      const json: any = await this.get(`https://earthview.withgoogle.com/_api/${slug}.json`);
      jsonList.push({slug: json.slug, photoUrl: json.photoUrl, name: json.name});
      jsonList = await this.parseSlugChain(json.nextSlug, jsonList);
      jsonList = await this.parseSlugChain(json.prevSlug, jsonList);
    }
    return jsonList;
  }

  private async get(url) {
    return new Promise( (resolve, reject) => {
        fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
            .then(res => res.json())
            .then(json => resolve(json))
            .catch(err => reject(err));
    });
  }

  private downloadFile(url: string, fileName: string, title: string): any {
    const vm = this;
    return new Promise((resolve, reject) => {

      const file = this.electronService.fs.createWriteStream(fileName);
      const request = this.electronService.https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close();
          vm.writeTextToImage(fileName, title).then( () => {
            resolve(true);
          });
           // close() is async, call cb after close completes.
        });
      }).on('error', function(err) { // Handle errors
        this.electronService.fs.unlink(fileName); // Delete the file async. (But we don't check the result)
        reject();
      });
    });
  }

  private async writeTextToImage(file, text) {
    const vm = this;
    return new Promise((resolve, reject) => {
      let loadedImage: any;

      vm.jimp.read(file)
        .then(function (image) {
            loadedImage = image;
            return vm.jimp.loadFont(vm.jimp.FONT_SANS_32_BLACK);
        })
        .then(function (font) {
            loadedImage.print(font, 10, loadedImage.bitmap.height - 100, {
              text: text,
              alignmentX: vm.jimp.HORIZONTAL_ALIGN_LEFT,
              alignmentY: vm.jimp.VERTICAL_ALIGN_BOTTOM
            }).write(file);
            resolve(true);
        })
        .catch(function (err) {
            reject(err);
        });
    });
  }



}

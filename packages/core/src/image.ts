import getPixels from "get-pixels";
import { getPixels as getPixelsN } from "ndarray-pixels"
import type { NdArray } from "ndarray";

export type ImageMimeType = "image/png" | "image/jpg" | "image/jpeg" | "image/gif" | "image/bmp";

/**
 * [Image description]
 * @param {[type]} pixels [description]
 */
export default class Image {
  private readonly pixels: NdArray<Uint8Array>;
  private readonly data: boolean[] = [];

  constructor(pixels: NdArray<Uint8Array>) {
    this.pixels = pixels;

    const rgbaData: number[][] = [];

    for (let i = 0; i < this.pixels.data.length; i += this.size.colors) {
      rgbaData.push(
        new Array(this.size.colors).fill(0).map((_, b) => this.pixels.data[i + b]),
      );
    }

    // Convert RGB to grayscale:
    this.data = rgbaData.map(([r, g, b, a]) => this.RGB2Gray(r, g, b, a));
  }

  get size() {
    return {
      width: this.pixels.shape[0],
      height: this.pixels.shape[1],
      colors: this.pixels.shape[2],
    };
  }

  private RGB2Gray(r: number, g: number, b: number, a: number) {
    if (a === 0) {
      return false;
    }
    return 0.29900 * r + 0.57800 * g + 0.11400 * b < 128;
  }

  toBitmap(density = 24) {
    const result: number[][] = [];
    let x, y, b, l, i;
    const c = density / 8;

    // n blocks of lines
    const n = Math.ceil(this.size.height / density);

    for (y = 0; y < n; y++) {
      // line data
      const ld: number[] = result[y] = [];

      for (x = 0; x < this.size.width; x++) {
        for (b = 0; b < density; b++) {
          i = x * c + (b >> 3);

          if (ld[i] === undefined) { ld[i] = 0; }

          l = y * density + b;
          if (l < this.size.height) {
            if (this.data[l * this.size.width + x]) {
              ld[i] += (0x80 >> (b & 0x7));
            }
          }
        }
      }
    }

    return {
      data: result,
      density,
    };
  }

  toRaster() {
    const result: number[] = [];
    const { width, height } = this.size;

    // n blocks of lines
    const n = Math.ceil(width / 8);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < n; x++) {
        for (let b = 0; b < 8; b++) {
          const i = x * 8 + b;

          if (result[y * n + x] === undefined) {
            result[y * n + x] = 0;
          }

          const c = x * 8 + b;
          if (c < width) {
            if (this.data[y * width + i]) {
              result[y * n + x] += (0x80 >> (b & 0x7));
            }
          }
        }
      }
    }
    return {
      data: result,
      width: n,
      height,
    };
  }

  /**
   * Load image from URL
   * @param  {[string]}   url      [description]
   * @param  {[type]}   type     [description]
   * @return {[Promise<Image>]}            [description]
   */
  static load(url: string | Uint8Array, type: ImageMimeType | null = null): Promise<Image> {
    return new Promise((resolve, reject) => {
      getPixels(url, type ?? "", (error, pixels) => {
        if (error) {
          reject(error);
        }
        else {
          resolve(new Image(pixels as NdArray<Uint8Array>));
        }
      });
    });
  }

  /**
   * Load image from Data
   * @param  {[Uint8Array]}   data      [description]
   * @param  {[string]}   type     [description]
   * @return {[Promise<Image>]}            [description]
   */
  static async loadData(data: Uint8Array, type: string): Promise<Image> {
    const pixels = await getPixelsN(data, type)
    return new Image(pixels)
  }
}

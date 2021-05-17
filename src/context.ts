
export interface Context {
    RGB: ImageData;
    
    Yp: number[];
    Cr: number[];
    Cb: number[];

    nCr: number[];
    nCb: number[];
}

export interface Position {
    x: number;
    y: number;
}

export function putPixel(image: ImageData, i: number, c: {R: number, G: number, B: number}) {
    image.data[i] = c.R & 0xFF;
    image.data[i+1] = c.G & 0xFF;
    image.data[i+2] = c.B & 0xFF;
    image.data[i+3] = 0xFF;
}

export function clamp(v: number) {
    return v < 0 ? 0 : v > 255 ? 255 : Math.floor(v);
}

export function clamp1(v: number) {
    return v < 1 ? 1 : v > 255 ? 255 : Math.floor(v);
}

export function RGB2YCrCb(R: number, G: number, B: number) {
    const Yp = Math.floor(0.299*R + 0.587*G + 0.114*B);
    const Cb = Math.floor(128 - 0.168736*R - 0.331264*G + 0.5*B);
    const Cr = Math.floor(128 + 0.5*R - 0.418688*G - 0.081312*B);
    return { Yp, Cb, Cr };
}

export function YCbCr2RGB(Yp: number, Cb: number, Cr: number) {
    const R = clamp(Yp                     +    1.402*(Cr - 128));
    const G = clamp(Yp - 0.344136*(Cb-128) - 0.714136*(Cr-128));
    const B = clamp(Yp +    1.772*(Cb-128));
    return { R, G, B };
}

export function reduceChrominanceSize(input: number[], width: number, height: number, xFactor: number, yFactor: number): number[] {
    const chWidth = Math.floor((width + xFactor - 1) / xFactor);
    const chHeight = Math.floor((height + yFactor - 1) / yFactor);
    const result = [];
    for (let y = 0; y < chHeight; ++y) {
        for (let x = 0; x < chWidth; ++x) {
            let v = input[x*xFactor + y*yFactor*width];
            let div = 1;
            if (xFactor == 2 && (x+1) < chWidth) {
                v += input[x*xFactor + 1 + y*yFactor*width];
                div *= 2;
            }
            if (yFactor == 2 && (y+1) < chHeight) {
                v += input[x*xFactor + (y*yFactor+1)*width];
                if ((x+1) < chWidth) {
                    v += input[x*xFactor + 1 + (y*yFactor+1)*width];
                }
                div *= 2;
            }
            result.push(Math.floor(v / div));
        }   
    }
    return result;
}

export function makeBlockAt(context: Context, px: number, py: number) {
    const result = [];
    for (let y = 0; y < 8; ++y) {
        const line = [];
        result.push(line);
        for (let x = 0; x < 8; ++x) {
            const xx = px*8 + x;
            const yy = py*8 + y;
            if (xx < context.RGB.width && yy < context.RGB.height) {
                line.push(context.Yp[yy*context.RGB.width + xx]);
            } else {
                line.push(0);
            }
        }
    }
    return result;
}

export function dct(data: number[][]) {
    const result = []
    for (let i = 0; i < 8; i++) {
        const line = [];
        result.push(line);
        for (let j = 0; j < 8; j++) {
            let C = 0.25;
            if (i == 0) {
                C *= Math.SQRT1_2;
            }
            if (j == 0) {
                C *= Math.SQRT1_2;
            }
            let sum = 0;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    sum += (data[y][x] - 128) * Math.cos((2*x+1)*j*Math.PI/16) * Math.cos((2*y+1)*i*Math.PI/16);
                }
            }
            // TODO should actually not be rounded before quantization, doesn't make much difference
            line.push(Math.round(C * sum));
        }    
    }
    return result;
}

export function idct(data: number[][]) {
    const result = []
    for (let i = 0; i < 8; i++) {
        const line = [];
        result.push(line);
        for (let j = 0; j < 8; j++) {
            
            let sum = 0;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    let C = 1;
                    if (y == 0) {
                        C *= Math.SQRT1_2;
                    }
                    if (x == 0) {
                        C *= Math.SQRT1_2;
                    }
                    sum += C * data[y][x] * Math.cos((2*j+1)*x*Math.PI/16) * Math.cos((2*i+1)*y*Math.PI/16);
                }
            }
            line.push(clamp(Math.trunc(128 + sum / 4)));
        }    
    }
    return result;
}

// Example Quantization Matrix from ITU-T81 specs

export const LUMINANCE_QUANT_TABLE = [
    [ 16, 11, 10, 16,  24,  40,  51,  61 ],
    [ 12, 12, 14, 19,  26,  58,  60,  55 ],
    [ 14, 13, 16, 24,  40,  57,  69,  56 ],
    [ 14, 17, 22, 29,  51,  87,  80,  62 ],
    [ 18, 22, 37, 56,  68, 109, 103,  77 ],
    [ 24, 35, 55, 64,  81, 104, 113,  92 ],
    [ 49, 64, 78, 87, 103, 121, 120, 101 ],
    [ 72, 92, 95, 98, 112, 100, 103, 199 ]
];

export const CHROMINANCE_QUANT_TABLE = [
    [ 17, 18, 24, 47, 99, 99, 99, 99 ],
    [ 18, 21, 26, 66, 99, 99, 99, 99 ],
    [ 24, 26, 56, 99, 99, 99, 99, 99 ],
    [ 47, 66, 99, 99, 99, 99, 99, 99 ],
    [ 99, 99, 99, 99, 99, 99, 99, 99 ],
    [ 99, 99, 99, 99, 99, 99, 99, 99 ],
    [ 99, 99, 99, 99, 99, 99, 99, 99 ],
    [ 99, 99, 99, 99, 99, 99, 99, 99 ]
];

export function quantize(data: number[][], quantMatrix: number[][]): number[][] {
    const result = []
    for (let i = 0; i < 8; i++) {
        const line = [];
        result.push(line);
        for (let j = 0; j < 8; j++) {
            line.push(Math.round(data[i][j] / quantMatrix[i][j]));
        }    
    }
    return result;
}

export function unquantize(data: number[][], quantMatrix: number[][]) {
    const result = []
    for (let i = 0; i < 8; i++) {
        const line = [];
        result.push(line);
        for (let j = 0; j < 8; j++) {
            line.push(data[i][j] * quantMatrix[i][j]);
        }    
    }
    return result;
}

export const ZIG_ZAG_TABLE_INV = [
     0,  1,  5,  6, 14, 15, 27, 28,
     2,  4,  7, 13, 16, 26, 29, 42,
     3,  8, 12, 17, 25, 30, 41, 43,
     9, 11, 18, 24, 31, 40, 44, 53,
    10, 19, 23, 32, 39, 45, 52, 54,
    20, 22, 33, 38, 46, 51, 55, 60,
    21, 34, 37, 47, 50, 56, 59, 61,
    35, 36, 48, 49, 57, 58, 62, 63
];

export const ZIG_ZAG_TABLE = [
     0,  1,  8, 16,  9,  2,  3, 10,
    17, 24, 32, 25, 18, 11,  4,  5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13,  6,  7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63
];
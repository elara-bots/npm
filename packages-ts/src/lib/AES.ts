import { is } from "@elara-services/basic-utils";
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "crypto";
import { name, version } from "../../package.json";
const header = `[${name}, v${version}]: [AES]`;

export class AES {
    public constructor(private key: string) {
        if (!is.string(key)) {
            throw new Error(
                `${header} You didn't include a key in the constructor.`,
            );
        }
    }
    public encrypt(input: string | Buffer) {
        const isString = is.string(input as string);
        const isBuffer = Buffer.isBuffer(input);
        if (
            !(isString || isBuffer) ||
            (isString && !input) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (isBuffer && !Buffer.byteLength(input as any))
        ) {
            throw new Error(
                `${header} Provided invalid 'input', must be a non-empty string or buffer.`,
            );
        }
        const sha = createHash("sha256");
        sha.update(this.key);
        const iv = randomBytes(16);
        // @ts-ignore
        const cipher = createCipheriv("aes-256-ctr", sha.digest(), iv);
        let buffer = input;
        if (isString) {
            // @ts-ignore
            buffer = Buffer.from(input);
        }
        // @ts-ignore
        const text = cipher.update(buffer);
        let encrypted: string | Buffer = Buffer.concat([
            // @ts-ignore
            iv,
            // @ts-ignore
            text,
            // @ts-ignore
            cipher.final(),
        ]);
        if (isString) {
            encrypted = encrypted.toString("base64");
        }
        return encrypted;
    }
    public decrypt(encrypted: string | Buffer) {
        const isString = is.string(encrypted as string);
        const isBuffer = Buffer.isBuffer(encrypted);
        if (
            !(isString || isBuffer) ||
            (isString && !encrypted) ||
            // @ts-ignore
            (isBuffer && !Buffer.byteLength(encrypted))
        ) {
            throw new Error(
                `${header} Provided "encrypted" must be a non-empty string or buffer`,
            );
        }
        const sha256 = createHash("sha256");
        sha256.update(this.key);
        let input = encrypted;
        if (isString) {
            // @ts-expect-error
            input = Buffer.from(encrypted, "base64");
            if (input.length < 17) {
                throw new Error(
                    `${header} Provided "encrypted" must decrypt to a non-empty string or buffer`,
                );
            }
        } else {
            // @ts-ignore
            if (Buffer.byteLength(encrypted) < 17) {
                throw new Error(
                    `${header} Provided "encrypted" must decrypt to a non-empty string or buffer`,
                );
            }
        }
        // @ts-ignore
        const decipher = createDecipheriv(
            "aes-256-ctr",
            sha256.digest(),
            input.slice(0, 16),
        );
        const ciphertext = input.slice(16);
        let output;
        if (isString) {
            // @ts-expect-error
            output = decipher.update(ciphertext) + decipher.final();
        } else {
            output = Buffer.concat([
                // @ts-expect-error
                decipher.update(ciphertext),
                // @ts-ignore
                decipher.final(),
            ]);
        }
        return output;
    }
}

import { is } from "@elara-services/utils";
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "crypto";
import { name, version } from "../../package.json";
const header = `[${name}, v${version}]: [AES]`;

export class AES {
    private key: string;
    public constructor(key: string) {
        if (!is.string(key)) {
            throw new Error(
                `${header} You didn't include a key in the constructor.`,
            );
        }
        this.key = key;
    }
    public encrypt(input: string | Buffer) {
        const isString = is.string(input as string);
        const isBuffer = Buffer.isBuffer(input);
        if (
            !(isString || isBuffer) ||
            (isString && !input) ||
            (isBuffer && !Buffer.byteLength(input))
        ) {
            throw new Error(
                `${header} Provided invalid 'input', must be a non-empty string or buffer.`,
            );
        }
        const sha = createHash("sha256");
        sha.update(this.key);
        const iv = randomBytes(16);
        const cipher = createCipheriv("aes-256-ctr", sha.digest(), iv);
        let buffer = input;
        if (isString) {
            buffer = Buffer.from(input);
        }
        const text = cipher.update(buffer);
        let encrypted: string | Buffer = Buffer.concat([
            iv,
            text,
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
            if (Buffer.byteLength(encrypted) < 17) {
                throw new Error(
                    `${header} Provided "encrypted" must decrypt to a non-empty string or buffer`,
                );
            }
        }
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
            // @ts-expect-error
            output = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);
        }
        return output;
    }
}

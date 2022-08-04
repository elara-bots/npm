const crypto = require("node:crypto"),
      CIPHER_ALGORITHM = 'aes-256-ctr';

module.exports = class AES256 {
    constructor(key) {
        if (!key || typeof key !== "string") throw new Error(`${this.header} 'key' is invalid or not a string.`);
        /** @private */
        this.key = key;
    };
    /** @private */
    get header() {
        return `[SECURITY]:`;
    };

    encrypt(input) {
        let isString = typeof input === 'string',
            isBuffer = Buffer.isBuffer(input);
        if (!(isString || isBuffer) || (isString && !input) || (isBuffer && !Buffer.byteLength(input))) {
            throw new Error(`${this.header} Provided invalid 'input', must be a non-empty string or buffer.`);
        };

        let sha = crypto.createHash("sha256");
        sha.update(this.key);

        let iv = crypto.randomBytes(16),
            cipher = crypto.createCipheriv(CIPHER_ALGORITHM, sha.digest(), iv),
            buffer = input;
        
        if (isString) buffer = Buffer.from(input);
        let text = cipher.update(buffer),
            encrypted = Buffer.concat([ iv, text, cipher.final() ]);
        
        if (isString) encrypted = encrypted.toString('base64');
        return encrypted;
    };

    decrypt(encrypted) {
        let [ isString, isBuffer ] = [
            typeof encrypted === 'string',
            Buffer.isBuffer(encrypted)
        ];
        if (!(isString || isBuffer) || (isString && !encrypted) || (isBuffer && !Buffer.byteLength(encrypted))) throw new Error(`${this.header} Provided "encrypted" must be a non-empty string or buffer`);
        let sha256 = crypto.createHash('sha256');
        sha256.update(this.key);
    
        let input = encrypted;
        if (isString) {
          input = Buffer.from(encrypted, 'base64');
          if (input.length < 17) throw new Error(`${this.header} Provided "encrypted" must decrypt to a non-empty string or buffer`);
        } else {
          if (Buffer.byteLength(encrypted) < 17) throw new Error(`${this.header} Provided "encrypted" must decrypt to a non-empty string or buffer`);
        }
    
        let iv = input.slice(0, 16),
            decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, sha256.digest(), iv),
            ciphertext = input.slice(16),
            output;
        if (isString) output = decipher.update(ciphertext) + decipher.final();
        else output = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return output;
    };
};
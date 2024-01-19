import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { gmailOptions } from "../interfaces";
import { Mailer } from "./mailer";

export class Server extends Mailer {
    public constructor(
        main: {
            email: string;
            options: gmailOptions;
        },
        private apiKey?: string,
        private port: number = 4040,
        debug?: boolean
    ) {
        super(main.email, main.options, debug);
    }

    public start() {
        const app = express()
            .use(express.urlencoded({ extended: false }))
            .use(express.json())
            .use(cors)
            .set("port", this.port);
        const isAuthorized = (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            if (!this.apiKey) {
                return next();
            }
            const key = req.headers["authorization"] || req.query.authorization;
            if (key !== this.apiKey) {
                return res
                    .status(401)
                    .json({ status: false, message: `Unauthorized` });
            }
            return next();
        };

        app.post(`/verify/sms`, isAuthorized, async (req, res) => {
            const { phone, codeLength } = req.body;
            if (!phone) {
                return res.json({
                    status: false,
                    message: `You didn't provide the 'phone' number`,
                });
            }
            const code = this.#generate(
                typeof codeLength === "number" ? codeLength : 15,
                {
                    lowerLetters: true,
                    upperLetters: true,
                    numbers: true,
                    symbols: false,
                }
            );
            if (!code) {
                return res.json({
                    status: false,
                    message: `Unable to generate the code.`,
                });
            }
            // @ts-ignore
            this.bug(`[SMS]: Verification code sending....`);
            const r = await this.phone(
                phone,
                `Verification Code: ${code}`
            ).catch((err) => {
                console.error(err);
                return null;
            });
            if (!r) {
                return res.json({
                    status: false,
                    message: `Unable to send the SMS verification message.`,
                });
            }
            return res.json({ status: true, code });
        });

        app.post(`/verify/email`, isAuthorized, async (req, res) => {
            const { email, codeLength } = req.body as {
                email: string;
                codeLength?: number;
            };
            if (!email) {
                return res.json({
                    status: false,
                    message: `You didn't provide the 'email'`,
                });
            }
            const code = this.#generate(
                typeof codeLength === "number" ? codeLength : 15,
                {
                    lowerLetters: true,
                    upperLetters: true,
                    numbers: true,
                    symbols: false,
                }
            );
            if (!code) {
                return res.json({
                    status: false,
                    message: `Unable to generate the code.`,
                });
            }
            // @ts-ignore
            this.bug(`[EMAIL]: Verification code sending....`);
            const r = await this.email(email, {
                subject: `Email Verification Code`,
                text: `Verification Code: ${code}`,
                html: `<html><body><center><h1>Verification Code</h1><h1><code style="background-color: grey; color: white;">${code}</code></h1></center></body></html>`,
            }).catch((err) => {
                console.error(err);
                return null;
            });
            if (!r) {
                return res.json({
                    status: false,
                    message: `Unable to send the email verification message.`,
                });
            }
            return res.json({ status: true, code });
        });

        app.post("/email", isAuthorized, async (req, res) => {
            const { email, subject, text, html } = req.body as {
                email: string;
                subject?: string;
                text?: string;
                html?: string;
            };
            if (!email) {
                return res.json({
                    status: false,
                    message: `You didn't provide the 'email'`,
                });
            }
            if (!text && !html) {
                return res.json({
                    status: false,
                    message: `You need to provide 'text' or 'html' in the body of the request.`,
                });
            }
            // @ts-ignore
            this.bug(`[EMAIL]: Sending email..`);
            const r = await this.email(email, { subject, text, html }).catch(
                (err) => {
                    console.error(err);
                    return null;
                }
            );
            if (!r) {
                return res.json({
                    status: false,
                    message: `Unable to send the email verification message.`,
                });
            }
            return res.json({ status: true, message: `Email sent!` });
        });

        app.post("/sms", isAuthorized, async (req, res) => {
            const { phone, text } = req.body as { phone: string; text: string };
            if (!phone) {
                return res.json({
                    status: false,
                    message: `You didn't provide the 'phone' number`,
                });
            }
            if (!text) {
                return res.json({
                    status: false,
                    message: `You need to provide 'text' in the body of the request.`,
                });
            }
            // @ts-ignore
            this.bug(`[PHONE]: Sending text..`);
            const r = await this.phone(phone, text).catch((err) => {
                console.error(err);
                return null;
            });
            if (!r) {
                return res.json({
                    status: false,
                    message: `Unable to send the text message.`,
                });
            }
            return res.json({ status: true, message: `Text message sent!` });
        });

        const l = app.listen(this.port);
        // @ts-ignore
        this.bug(`[SERVER]: Started on ${l.address()?.port || this.port}`);
        return app;
    }

    #generate(
        length = 10,
        options: {
            upperLetters?: boolean;
            lowerLetters?: boolean;
            numbers?: boolean;
            symbols?: boolean;
        } = {}
    ) {
        const upperLetters = options?.upperLetters ?? true;
        const lowerLetters = options?.lowerLetters ?? true;
        const numbers = options?.numbers ?? true;
        const symbols = options?.symbols ?? false;

        if (!length || length <= 0) {
            return null;
        }
        if (!upperLetters && !lowerLetters && !numbers && !symbols) {
            return null;
        }

        let charatters = "";

        if (upperLetters) {
            charatters += "ABCDEFGHIJKLMNOPQRSTUWXYZ";
        }
        if (lowerLetters) {
            charatters += "abcdefghijklmnpqrstuwxyz";
        }
        if (numbers) {
            charatters += "1234567890";
        }
        if (symbols) {
            charatters += "!@#$%^&*.()";
        }

        let code = "";

        for (let i = 0; i < length; i++) {
            code += charatters.charAt(
                Math.floor(Math.random() * charatters.length)
            );
        }

        return code;
    }
}

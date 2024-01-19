import { google } from "googleapis";
import { createTransport } from "nodemailer";
import { name, version } from "../../package.json";
import { carriers, providers } from "../lib";
import { gmailOptions } from "../interfaces";

export class Mailer {
    private data: {
        access_token: string;
        scope: string;
        token_type: string;
        expiry_date: number;
        refresh_token: string;
    } | null = null;
    public constructor(
        private gmail: string,
        private gmailOptions: gmailOptions,
        private debug?: boolean
    ) {
        if (!this.gmailOptions.clientId) {
            throw new Error(`You failed to provided 'gmailOptions.clientId'`);
        }
        if (!this.gmailOptions.clientSecret) {
            throw new Error(
                `You failed to provided 'gmailOptions.clientSecret'`
            );
        }
        if (!this.gmailOptions.refreshToken) {
            throw new Error(
                `You failed to provided 'gmailOptions.refreshToken'`
            );
        }
    }

    private async generateAccessTokens() {
        const oauth = new google.auth.OAuth2(
            this.gmailOptions.clientId,
            this.gmailOptions.clientSecret,
            "https://developers.google.com/oauthplayground"
        );
        oauth.setCredentials({ refresh_token: this.gmailOptions.refreshToken });
        const r = await oauth.refreshAccessToken().catch((err) => {
            this.bug(err);
            return null;
        });
        if (!r) {
            return null;
        }
        if (r && r.credentials?.access_token) {
            this.data = {
                access_token: r.credentials.access_token,
                expiry_date: r.credentials.expiry_date as number,
                refresh_token: r.credentials.refresh_token as string,
                scope: r.credentials.scope as string,
                token_type: r.credentials.scope as string,
            };
        }
        return this.data;
    }

    private async mail() {
        const transport = () =>
            createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: this.gmail,
                    accessToken: this.data?.access_token,
                    refreshToken: this.data?.refresh_token,
                },
            });
        if (this.data) {
            if (Date.now() <= this.data.expiry_date) {
                await this.generateAccessTokens();
                return transport();
            } else {
                return transport();
            }
        } else {
            await this.generateAccessTokens();
        }
        return transport();
    }

    public async phone(
        number: string,
        text: string,
        region: keyof typeof providers = "us",
        carrier?: keyof typeof carriers
    ) {
        const mail = await this.mail();
        let providersList;
        if (carrier) {
            providersList = carriers[carrier as keyof typeof carriers];
        } else {
            providersList =
                providers[(region || "us") as keyof typeof providers];
        }

        return await Promise.all(
            providersList.map((provider) => {
                const to = provider.replace("%s", number);
                return new Promise((resolve, reject) =>
                    mail.sendMail(
                        {
                            to,
                            text,
                            html: text,
                            from: this.gmailOptions.username
                                ? `${this.gmailOptions.username} <${this.gmail}>`
                                : this.gmail,
                        },
                        (err, info) => {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(info);
                        }
                    )
                );
            })
        );
    }

    public async email(
        emails: string[] | string,
        options: {
            text?: string;
            html?: string;
            subject?: string;
        }
    ) {
        if (!options.html && !options.text && !options.subject) {
            throw new Error(`You didn't provide anything to send!`);
        }
        const mail = await this.mail();
        return mail.sendMail({
            to: typeof emails === "string" ? emails : emails.join(", "),
            from: this.gmailOptions.username
                ? `${this.gmailOptions.username} <${this.gmail}>`
                : this.gmail,
            text: options.text,
            subject: options.subject,
            html: options.html,
        });
    }

    private bug(...args: unknown[]) {
        if (!this.debug) {
            return this;
        }
        console.debug(`[${name}, v${version}]`, ...args);
        return this;
    }
}

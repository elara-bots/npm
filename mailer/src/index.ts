import { createTransport } from "nodemailer";
import { carriers } from "./lib/carriers";
import { providers } from "./lib/providers";

export class Mailer {
    public constructor(
        private gmail: string,
        private gmailOptions: {
            username?: string;
            accessToken: string;
            refreshToken: string;
        }
    ) {
        if (!this.gmailOptions.accessToken) {
            throw new Error(
                `You failed to provided 'gmailOptions.accessToken'`
            );
        }
        if (!this.gmailOptions.refreshToken) {
            throw new Error(
                `You failed to provided 'gmailOptions.refreshToken'`
            );
        }
    }

    private get mail() {
        return createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: this.gmail,
                accessToken: this.gmailOptions.accessToken,
                refreshToken: this.gmailOptions.refreshToken,
            },
        });
    }

    public async phone(
        number: string,
        text: string,
        region: keyof typeof providers = "us",
        carrier?: keyof typeof carriers
    ) {
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
                    this.mail.sendMail(
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
        return this.mail.sendMail({
            to: typeof emails === "string" ? emails : emails.join(", "),
            from: this.gmailOptions.username
                ? `${this.gmailOptions.username} <${this.gmail}>`
                : this.gmail,
            text: options.text,
            subject: options.subject,
            html: options.html,
        });
    }
}

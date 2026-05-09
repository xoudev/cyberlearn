"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicLinkEmail = MagicLinkEmail;
exports.getMagicLinkSubject = getMagicLinkSubject;
exports.sendMagicLinkEmail = sendMagicLinkEmail;
const jsx_runtime_1 = require("react/jsx-runtime");
const components_1 = require("@react-email/components");
const resend_1 = require("resend");
const SUBJECT = {
  magiclink: "Ton lien de connexion · Cyber Learn",
  signup: "Confirme ton compte · Cyber Learn",
  recovery: "Réinitialise ton accès · Cyber Learn",
  invite: "Tu es invité sur Cyber Learn",
  email_change: "Confirme ton nouvel email · Cyber Learn",
};
const HEADING = {
  magiclink: "Connexion à Cyber Learn",
  signup: "Confirme ton compte",
  recovery: "Réinitialise ton accès",
  invite: "Invitation à rejoindre",
  email_change: "Changement d'adresse email",
};
const DESCRIPTION = {
  magiclink: "Clique sur le bouton ci-dessous pour te connecter à ta plateforme d'apprentissage.",
  signup: "Clique ci-dessous pour confirmer ton compte et commencer à apprendre.",
  recovery: "Clique ci-dessous pour réinitialiser l'accès à ton compte.",
  invite: "Tu as été invité à rejoindre Cyber Learn. Clique ci-dessous pour accepter.",
  email_change: "Clique ci-dessous pour confirmer ton nouvel email.",
};
const BUTTON_LABEL = {
  magiclink: "Se connecter →",
  signup: "Confirmer mon compte →",
  recovery: "Réinitialiser mon accès →",
  invite: "Accepter l'invitation →",
  email_change: "Confirmer le changement →",
};
function MagicLinkEmail({ magicLink, type = "magiclink" }) {
  return (0, jsx_runtime_1.jsxs)(components_1.Html, {
    children: [
      (0, jsx_runtime_1.jsx)(components_1.Head, {}),
      (0, jsx_runtime_1.jsx)(components_1.Preview, { children: SUBJECT[type] }),
      (0, jsx_runtime_1.jsx)(components_1.Body, {
        style: styles.main,
        children: (0, jsx_runtime_1.jsxs)(components_1.Container, {
          style: styles.container,
          children: [
            (0, jsx_runtime_1.jsx)(components_1.Section, {
              style: styles.logoSection,
              children: (0, jsx_runtime_1.jsx)(components_1.Text, {
                style: styles.logoText,
                children: "CYBER LEARN",
              }),
            }),
            (0, jsx_runtime_1.jsxs)(components_1.Section, {
              style: styles.card,
              children: [
                (0, jsx_runtime_1.jsx)(components_1.Heading, {
                  style: styles.heading,
                  children: HEADING[type],
                }),
                (0, jsx_runtime_1.jsx)(components_1.Text, {
                  style: styles.paragraph,
                  children: DESCRIPTION[type],
                }),
                (0, jsx_runtime_1.jsxs)(components_1.Text, {
                  style: styles.paragraph,
                  children: [
                    "Ce lien expire dans ",
                    (0, jsx_runtime_1.jsx)("strong", {
                      style: { color: "#F5F5FA" },
                      children: "1 heure",
                    }),
                    " et ne peut \u00EAtre utilis\u00E9 qu'une seule fois.",
                  ],
                }),
                (0, jsx_runtime_1.jsx)(components_1.Section, {
                  style: styles.buttonWrap,
                  children: (0, jsx_runtime_1.jsx)(components_1.Button, {
                    style: styles.button,
                    href: magicLink,
                    children: BUTTON_LABEL[type],
                  }),
                }),
                (0, jsx_runtime_1.jsx)(components_1.Hr, { style: styles.hr }),
                (0, jsx_runtime_1.jsx)(components_1.Text, {
                  style: styles.muted,
                  children:
                    "Si tu n'es pas \u00E0 l'origine de cette demande, ignore cet email. Aucune action n'est requise.",
                }),
              ],
            }),
            (0, jsx_runtime_1.jsxs)(components_1.Section, {
              style: styles.footer,
              children: [
                (0, jsx_runtime_1.jsx)(components_1.Text, {
                  style: styles.footerText,
                  children:
                    "Cyber Learn \u00B7 Plateforme d'apprentissage en cybers\u00E9curit\u00E9 & d\u00E9veloppement",
                }),
                (0, jsx_runtime_1.jsx)(components_1.Text, {
                  style: styles.footerText,
                  children: (0, jsx_runtime_1.jsx)("a", {
                    href: "https://cyberlearn.fr",
                    style: styles.footerLink,
                    children: "cyberlearn.fr",
                  }),
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
function getMagicLinkSubject(type) {
  return SUBJECT[type] ?? SUBJECT.magiclink;
}
const styles = {
  main: {
    backgroundColor: "#030219",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "40px 0",
  },
  container: {
    maxWidth: "520px",
    margin: "0 auto",
  },
  logoSection: {
    paddingBottom: "20px",
    textAlign: "center",
  },
  logoText: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.25em",
    color: "#0AFFD4",
    margin: "0",
  },
  card: {
    backgroundColor: "#0A0826",
    border: "1px solid #1F1B47",
    borderRadius: "12px",
    padding: "40px 36px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#F5F5FA",
    margin: "0 0 16px",
    letterSpacing: "-0.02em",
  },
  paragraph: {
    fontSize: "14px",
    color: "#B8B5D1",
    lineHeight: "1.65",
    margin: "0 0 14px",
  },
  buttonWrap: {
    margin: "28px 0",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0024FF",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "14px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
  },
  hr: {
    borderColor: "#1F1B47",
    margin: "24px 0",
  },
  muted: {
    fontSize: "12px",
    color: "#6B6890",
    lineHeight: "1.5",
    margin: "0",
  },
  footer: {
    paddingTop: "20px",
    textAlign: "center",
  },
  footerText: {
    fontSize: "11px",
    color: "#3F3D5C",
    margin: "0 0 4px",
  },
  footerLink: {
    color: "#4D8BFF",
    textDecoration: "none",
  },
};
async function sendMagicLinkEmail({ apiKey, from, to, magicLink, type = "magiclink" }) {
  const resend = new resend_1.Resend(apiKey);
  const html = await (0, components_1.render)(MagicLinkEmail({ magicLink, type }));
  const { error } = await resend.emails.send({
    from,
    to,
    subject: getMagicLinkSubject(type),
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
//# sourceMappingURL=magic-link.js.map
